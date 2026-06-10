-- Questline — Phase A: Fix #1 (generate_child_quests auth.uid), Fix #2 (date-bound weekday check)

-- ======================================================================
-- Fix #1: generate_child_quests — add auth.uid() guard
-- ======================================================================
create or replace function public.generate_child_quests(p_quest_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_parent record;
  v_weekday text;
  v_existing_id uuid;
begin
  select * into strict v_parent from public.quest where id = p_quest_id;

  -- Fix #1: Verify caller owns the parent quest
  if v_parent.user_id != auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_parent.cadence not in ('weekly', 'monthly', 'yearly') then
    raise exception 'generate_child_quests: parent cadence must be weekly or higher';
  end if;

  if v_parent.weekdays is null or coalesce(array_length(v_parent.weekdays, 1), 0) = 0 then
    return;
  end if;

  foreach v_weekday in array v_parent.weekdays
  loop
    select id into v_existing_id from public.quest
      where generated_parent_id = p_quest_id
        and array_length(weekdays, 1) = 1
        and weekdays[1] = v_weekday
      limit 1;

    if v_existing_id is null then
      insert into public.quest (
        user_id, habit_id, title, cadence, target_count, unit,
        weekdays, generated_parent_id, calendar_sync, reminder_time,
        active_from, active_to, archived
      ) values (
        v_parent.user_id,
        v_parent.habit_id,
        v_parent.title,
        'daily',
        v_parent.target_count,
        v_parent.unit,
        array[v_weekday],
        v_parent.id,
        v_parent.calendar_sync,
        v_parent.reminder_time,
        v_parent.active_from,
        v_parent.active_to,
        false
      );
    end if;
  end loop;
end;
$$;

-- ======================================================================
-- Fix #2: apply_quest_event — date-bound non-first-weekday consecutive check
-- The v_idx > 1 branch now computes the exact expected date of the previous
-- weekday in the same ISO week, instead of an unbounded "ever completed?" query.
-- ======================================================================
create or replace function public.apply_quest_event(
  p_event_id uuid,
  p_instance_id uuid,
  p_kind event_kind,
  p_delta int,
  p_client_ts timestamptz default now()
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_quest_id uuid;
  v_cadence cadence;
  v_old_progress int;
  v_target int;
  v_new_progress int;
  v_new_completed bool;
  v_now_completed bool;
  v_period_key text;
  v_xp_amount int := 0;
  v_streak_current int;
  v_streak_longest int;
  v_streak_last text;
  v_streak_new_current int;
  v_streak_quest_id uuid;
  v_generated_parent_id uuid;
  v_parent_weekdays text[];
  v_parent_cadence cadence;
  v_event_exists bool;
  v_result jsonb;
  v_idx int;
  v_prev_wd text;
  v_prev_period_key text;
  v_is_next bool := false;
  v_weekday_map text[] := array['mon','tue','wed','thu','fri','sat','sun'];
  v_last_wd text;
  v_last_wd_idx int;
  v_curr_date date;
  v_prev_period_date date;
  v_prev_child_period_key text;
  v_curr_parent_period text;
  v_i int;
  v_curr_dow int;
begin
  -- Resolve instance info
  select qi.user_id, qi.quest_id, q.cadence, qi.progress, qi.target_count, qi.period_key,
         coalesce(q.generated_parent_id, qi.quest_id) as streak_quest_id,
         q.generated_parent_id
    into strict v_user_id, v_quest_id, v_cadence, v_old_progress, v_target, v_period_key,
         v_streak_quest_id, v_generated_parent_id
    from public.quest_instance qi
    join public.quest q on q.id = qi.quest_id
    where qi.id = p_instance_id;

  -- Verify caller owns the data (security definer bypasses RLS)
  if v_user_id != auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Load parent data if this is a child quest
  if v_generated_parent_id is not null then
    select weekdays, cadence into v_parent_weekdays, v_parent_cadence
      from public.quest where id = v_streak_quest_id;
  end if;

  -- Idempotency check
  select exists(select 1 from public.quest_event where id = p_event_id)
    into v_event_exists;
  if v_event_exists then
    select jsonb_build_object(
      'applied', false,
      'instance', row_to_json(qi.*),
      'xp_granted', 0,
      'streak_after', coalesce((select current from public.streak where quest_id = v_streak_quest_id), 0)
    ) into v_result
    from public.quest_instance qi where qi.id = p_instance_id;
    return v_result;
  end if;

  -- Record the event
  insert into public.quest_event (id, user_id, instance_id, kind, delta, created_at)
    values (p_event_id, v_user_id, p_instance_id, p_kind, p_delta, p_client_ts);

  -- Compute new progress
  if p_kind = 'increment' then
    v_new_progress := least(v_old_progress + p_delta, v_target);
    v_new_completed := v_new_progress >= v_target;
  elsif p_kind = 'complete' then
    v_new_progress := v_target;
    v_new_completed := true;
  elsif p_kind = 'uncomplete' then
    v_new_progress := greatest(v_old_progress - p_delta, 0);
    v_new_completed := false;
  else
    v_new_progress := v_old_progress;
    v_new_completed := (v_old_progress >= v_target);
  end if;

  v_now_completed := (not v_old_progress >= v_target) and v_new_completed;

  -- Update the instance
  update public.quest_instance qi
    set
      progress = v_new_progress,
      completed = v_new_completed,
      completed_at = case when v_now_completed then now() else qi.completed_at end
    where qi.id = p_instance_id;

  -- On fresh completion: handle XP + streak
  if v_now_completed and p_kind != 'uncomplete' then
    select current, longest, last_period_key
      into v_streak_current, v_streak_longest, v_streak_last
      from public.streak where quest_id = v_streak_quest_id;

    if v_streak_current is null then
      v_streak_new_current := 1;
      v_streak_longest := 1;
    else
      -- Determine consecutive tracking based on parent weekday order (for children)
      if v_generated_parent_id is not null
         and v_parent_weekdays is not null
         and array_length(v_parent_weekdays, 1) > 0
      then
        -- Get current child's weekday and index in parent's list
        select weekdays[1] into v_prev_wd
          from public.quest where id = v_quest_id;
        select ordinality into v_idx
          from unnest(v_parent_weekdays) with ordinality w
          where w = v_prev_wd;

        if v_idx > 1 then
          -- Non-first weekday: check if previous weekday was completed THIS period
          v_prev_wd := v_parent_weekdays[v_idx - 1];
          v_curr_date := v_period_key::date;
          v_curr_dow := extract(isodow from v_curr_date);

          -- Find isodow of the previous weekday
          v_last_wd_idx := 0;
          for v_i in 1..7 loop
            if v_weekday_map[v_i] = v_prev_wd then
              v_last_wd_idx := v_i;
              exit;
            end if;
          end loop;

          if v_last_wd_idx > 0 then
            -- Compute exact expected date: same ISO week, earlier weekday
            v_prev_child_period_key := to_char(
              v_curr_date - (v_curr_dow - v_last_wd_idx),
              'YYYY-MM-DD'
            );
            -- Only count if completed on THAT exact date (fixes gap scenario)
            select qi2.period_key into v_prev_period_key
              from public.quest_instance qi2
              join public.quest qc on qc.id = qi2.quest_id
              where qc.generated_parent_id = v_generated_parent_id
                and qc.weekdays[1] = v_prev_wd
                and qi2.period_key = v_prev_child_period_key
                and qi2.completed = true
                and qi2.user_id = v_user_id
              limit 1;
            v_is_next := v_prev_period_key is not null;
          else
            v_is_next := false;
          end if;
        else
          -- First weekday in parent's list: check previous cycle's last weekday
          v_last_wd := v_parent_weekdays[array_length(v_parent_weekdays, 1)];
          v_curr_date := v_period_key::date;
          v_curr_parent_period := public.period_key_for(v_parent_cadence, v_curr_date);

          if v_parent_cadence = 'weekly' then
            v_prev_period_date := v_curr_date - 7;
            v_last_wd_idx := 0;
            for v_i in 1..7 loop
              if v_weekday_map[v_i] = v_last_wd then
                v_last_wd_idx := v_i;
                exit;
              end if;
            end loop;
            if v_last_wd_idx > 0 then
              v_prev_period_date := v_prev_period_date
                - (extract(isodow from v_prev_period_date) - v_last_wd_idx);
              v_prev_child_period_key := to_char(v_prev_period_date, 'YYYY-MM-DD');
              select qi2.period_key into v_prev_period_key
                from public.quest_instance qi2
                join public.quest qc on qc.id = qi2.quest_id
                where qc.generated_parent_id = v_generated_parent_id
                  and qc.weekdays[1] = v_last_wd
                  and qi2.period_key = v_prev_child_period_key
                  and qi2.completed = true
                  and qi2.user_id = v_user_id
                limit 1;
              v_is_next := v_prev_period_key is not null;
            else
              v_is_next := false;
            end if;
          else
            v_is_next := false;
          end if;
        end if;
      else
        -- Standard streak (non-child quest): consecutive calendar periods
        v_is_next := (v_period_key = public.next_period_key(v_streak_last, v_cadence));
      end if;

      if v_period_key = v_streak_last then
        v_streak_new_current := v_streak_current;
      elsif v_is_next then
        v_streak_new_current := v_streak_current + 1;
      else
        v_streak_new_current := 1;
      end if;
      v_streak_longest := greatest(v_streak_longest, v_streak_new_current);
    end if;

    insert into public.streak (user_id, quest_id, current, longest, last_period_key)
      values (v_user_id, v_streak_quest_id, v_streak_new_current, v_streak_longest, v_period_key)
      on conflict (quest_id) do update set
        current = v_streak_new_current,
        longest = v_streak_longest,
        last_period_key = v_period_key;

    v_xp_amount := public.compute_xp(v_streak_new_current, v_cadence);
    insert into public.xp_event (user_id, source_instance_id, amount, reason)
      values (v_user_id, p_instance_id, v_xp_amount, 'quest_complete');
  else
    select current into v_streak_new_current
      from public.streak where quest_id = v_streak_quest_id;
    if v_streak_new_current is null then v_streak_new_current := 0; end if;
  end if;

  select jsonb_build_object(
    'applied', true,
    'instance', row_to_json(qi.*),
    'xp_granted', v_xp_amount,
    'streak_after', v_streak_new_current
  ) into v_result
  from public.quest_instance qi where qi.id = p_instance_id;

  return v_result;
end;
$$;

-- Questline — Phase A fixes: auth.uid() checks, first-weekday streak, RLS hardening
-- Addresses: Lead verdict Fix #1 (BLOCKER), #2 (SECONDARY), #3 (NIT), .gitignore

-- ======================================================================
-- §6a — apply_quest_event: add auth.uid() check + fix first-weekday streak
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

  -- Fix #1: Verify caller owns the data (security definer bypasses RLS)
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
      -- Fix #2: For child quests, check parent's weekday order for consecutive tracking
      if v_generated_parent_id is not null
         and v_parent_weekdays is not null
         and array_length(v_parent_weekdays, 1) > 0
      then
        -- Get current child's weekday and its index in parent's list
        select weekdays[1] into v_prev_wd
          from public.quest where id = v_quest_id;
        select ordinality into v_idx
          from unnest(v_parent_weekdays) with ordinality w
          where w = v_prev_wd;

        if v_idx > 1 then
          -- Check if previous weekday's child was completed
          v_prev_wd := v_parent_weekdays[v_idx - 1];
          select qi2.period_key into v_prev_period_key
            from public.quest_instance qi2
            join public.quest qc on qc.id = qi2.quest_id
            where qc.generated_parent_id = v_generated_parent_id
              and qc.weekdays[1] = v_prev_wd
              and qi2.completed = true
              and qi2.user_id = v_user_id
            order by qi2.period_key desc
            limit 1;
          v_is_next := v_prev_period_key is not null;
        else
          -- First weekday in parent's list.
          -- Fix #2: check if the PREVIOUS CYCLE's last weekday was completed.
          v_last_wd := v_parent_weekdays[array_length(v_parent_weekdays, 1)];

          -- Compute previous cycle boundary for the parent cadence
          v_curr_date := v_period_key::date;
          v_curr_parent_period := public.period_key_for(v_parent_cadence, v_curr_date);

          if v_parent_cadence = 'weekly' then
            -- Go back 7 days from current date, find the last weekday's date
            v_prev_period_date := v_curr_date - 7;
            -- Find ISO DOW of the last weekday
            v_last_wd_idx := 0;
            for v_i in 1..7 loop
              if v_weekday_map[v_i] = v_last_wd then
                v_last_wd_idx := v_i;
                exit;
              end if;
            end loop;
            if v_last_wd_idx > 0 then
              -- Compute date of v_last_wd in the previous week
              v_prev_period_date := v_prev_period_date
                - (extract(isodow from v_prev_period_date) - v_last_wd_idx);
              v_prev_child_period_key := to_char(v_prev_period_date, 'YYYY-MM-DD');
              -- Check if that child was completed
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
            -- For monthly/yearly: not yet implemented (no weekly+ children in MVP)
            v_is_next := false;
          end if;
        end if;
      else
        -- Standard streak (non-child quest): check consecutive calendar periods
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

    -- Grant XP
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

-- ======================================================================
-- §6b — ensure_instances: use auth.uid() instead of p_user_id param
-- ======================================================================
create or replace function public.ensure_instances(p_date date default current_date)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_rec record;
  v_period_key text;
  v_target int;
  v_dow int;
  v_weekday_map text[] := array['mon','tue','wed','thu','fri','sat','sun'];
begin
  for v_rec in
    select q.* from public.quest q
    where q.user_id = v_user_id
      and q.archived = false
      and q.active_from <= p_date
      and (q.active_to is null or q.active_to >= p_date)
  loop
    if v_rec.cadence = 'daily' then
      if v_rec.generated_parent_id is not null and array_length(v_rec.weekdays, 1) = 1 then
        v_dow := extract(isodow from p_date)::int;
        if v_weekday_map[v_dow] != v_rec.weekdays[1] then
          continue;
        end if;
      end if;
      v_period_key := public.period_key_for('daily'::cadence, p_date);
    elsif v_rec.cadence in ('weekly', 'monthly', 'yearly') then
      v_period_key := public.period_key_for(v_rec.cadence, p_date);
    else
      continue;
    end if;

    begin
      insert into public.quest_instance (user_id, quest_id, period_key, progress, target_count, completed)
        values (v_user_id, v_rec.id, v_period_key, 0, v_rec.target_count, false);
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

-- ======================================================================
-- §6d — log_sleep: use auth.uid() instead of p_user_id param
-- ======================================================================
create or replace function public.log_sleep(
  p_night_of date,
  p_hours numeric(3,1)
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row record;
  v_user_id uuid := auth.uid();
begin
  insert into public.sleep_log (user_id, night_of, hours)
    values (v_user_id, p_night_of, p_hours)
    on conflict (user_id, night_of) do update set
      hours = excluded.hours,
      created_at = now()
    returning id, night_of, hours into v_row;
  return jsonb_build_object('id', v_row.id, 'night_of', v_row.night_of, 'hours', v_row.hours);
end;
$$;

-- ======================================================================
-- §4 fix — Remove quest_event INSERT/UPDATE policies (Fix #3)
-- Only the definer RPC should write quest_event (like xp_event).
-- ======================================================================
drop policy if exists "own rows - insert" on public.quest_event;
drop policy if exists "own rows - update" on public.quest_event;
-- Keep only SELECT policy
-- (INSERT/UPDATE still possible through the definer RPC since it owns the data)

-- ======================================================================
-- ✓ All Phase A fixes applied: auth.uid() guards, streak logic, RLS hardening
-- ======================================================================

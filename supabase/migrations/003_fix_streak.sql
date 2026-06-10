-- Fix apply_quest_event: resolve instance BEFORE idempotency check
-- so streak_quest_id is available for both paths
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
  v_event_exists bool;
  v_result jsonb;
  v_idx int;
  v_prev_wd text;
  v_prev_period_key text;
  v_is_next bool := false;
begin
  -- Resolve instance info FIRST so v_streak_quest_id is available for both paths
  select qi.user_id, qi.quest_id, q.cadence, qi.progress, qi.target_count, qi.period_key,
         coalesce(q.generated_parent_id, qi.quest_id) as streak_quest_id,
         q.generated_parent_id
    into strict v_user_id, v_quest_id, v_cadence, v_old_progress, v_target, v_period_key,
         v_streak_quest_id, v_generated_parent_id
    from public.quest_instance qi
    join public.quest q on q.id = qi.quest_id
    where qi.id = p_instance_id;

  -- For child quests, get the parent's weekdays list
  if v_generated_parent_id is not null then
    select weekdays into v_parent_weekdays from public.quest where id = v_streak_quest_id;
  end if;

  -- Idempotency check (v_streak_quest_id is now available)
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
    -- Read or initialise streak (using parent quest ID for children)
    select current, longest, last_period_key
      into v_streak_current, v_streak_longest, v_streak_last
      from public.streak where quest_id = v_streak_quest_id;

    if v_streak_current is null then
      -- First completion ever for this parent/quest
      v_streak_new_current := 1;
      v_streak_longest := 1;
    else
      -- Determine if this is consecutive.
      -- For child quests (generated from weekly+ parent with weekdays): check if
      -- the previous weekday in the parent's weekdays list had a completed instance
      -- (docs/05 §8 — consecutive across children of the same parent).
      if v_generated_parent_id is not null
         and v_parent_weekdays is not null
         and array_length(v_parent_weekdays, 1) > 0
      then
        -- Get current child's weekday
        select weekdays[1] into v_prev_wd
          from public.quest where id = v_quest_id;
        -- Find its index in parent's weekday list
        select ordinality into v_idx
          from unnest(v_parent_weekdays) with ordinality w
          where w = v_prev_wd;
        if v_idx is not null and v_idx > 1 then
          -- Check if the previous weekday's child was completed
          select qi2.period_key into v_prev_period_key
            from public.quest_instance qi2
            join public.quest qc on qc.id = qi2.quest_id
            where qc.generated_parent_id = v_generated_parent_id
              and qc.weekdays[1] = v_parent_weekdays[v_idx - 1]
              and qi2.completed = true
              and qi2.user_id = v_user_id
            order by qi2.period_key desc
            limit 1;
          v_is_next := v_prev_period_key is not null;
        else
          -- First weekday in the list, no previous to check
          v_is_next := true;
        end if;
      else
        -- Standard streak: check consecutive calendar periods
        v_is_next := (v_period_key = public.next_period_key(v_streak_last, v_cadence));
      end if;

      if v_period_key = v_streak_last then
        -- Idempotent re-complete, no change
        v_streak_new_current := v_streak_current;
      elsif v_is_next then
        -- Consecutive period
        v_streak_new_current := v_streak_current + 1;
      else
        -- Gap — streak resets
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

  -- Return result
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

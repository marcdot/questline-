-- Questline — Update functions only (safe to re-run)
-- Run this in the SQL Editor to patch apply_quest_event streak logic.

-- ========================
-- apply_quest_event (FIXED: child quests share parent streak)
-- ========================
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
  v_event_exists bool;
  v_result jsonb;
begin
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

  -- Resolve user, quest, and cadence from the instance.
  -- For generated child quests (children of weekly+ parents), use the PARENT quest
  -- for streak tracking so completions chain across children (docs/05 §6, §8).
  select qi.user_id, qi.quest_id, q.cadence, qi.progress, qi.target_count, qi.period_key,
         coalesce(q.generated_parent_id, qi.quest_id) as streak_quest_id
    into strict v_user_id, v_quest_id, v_cadence, v_old_progress, v_target, v_period_key,
         v_streak_quest_id
    from public.quest_instance qi
    join public.quest q on q.id = qi.quest_id
    where qi.id = p_instance_id;

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
    -- Read or initialise streak for this quest (using parent quest for children)
    select current, longest, last_period_key
      into v_streak_current, v_streak_longest, v_streak_last
      from public.streak where quest_id = v_streak_quest_id;

    if v_streak_current is null then
      -- First completion ever for this quest
      v_streak_new_current := 1;
      v_streak_longest := 1;
    else
      -- Determine new streak count
      if v_period_key = v_streak_last then
        -- Idempotent re-complete, no change
        v_streak_new_current := v_streak_current;
      elsif v_period_key = public.next_period_key(v_streak_last, v_cadence) then
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

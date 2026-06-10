-- ============================================================================
-- Questline — Phase A: Full Schema, RLS, RPCs, Trigger
-- Run this in Supabase SQL Editor exactly once (in the `questline-dev` project).
-- Implements docs/02 (data model) + docs/04 (backend) + docs/05 (gamification).
-- ============================================================================

-- ############################################################################
-- §1 — ENUMS
-- ############################################################################
create type cadence    as enum ('daily','weekly','monthly','yearly');
create type event_kind as enum ('increment','complete','uncomplete');
create type theme_pref as enum ('system','light','dark');
create type xp_display as enum ('simple','detailed');

-- ############################################################################
-- §2 — TABLES (match docs/02 field names exactly)
-- ############################################################################

-- user_profile (mirrors auth.users)
create table public.user_profile (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- user_settings (1:1 with user)
create table public.user_settings (
  user_id uuid primary key references public.user_profile on delete cascade,
  theme theme_pref not null default 'system',
  xp_display xp_display not null default 'simple',
  calendar_sync_enabled bool not null default false,
  reminders_enabled bool not null default true,
  google_connected bool not null default false,
  updated_at timestamptz not null default now()
);

-- habit
create table public.habit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  name text not null,
  color text not null,                      -- #RRGGBB
  sort_order int not null default 0,
  archived bool not null default false,
  created_at timestamptz not null default now()
);

-- quest
create table public.quest (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  habit_id uuid references public.habit on delete set null,
  title text not null,
  cadence cadence not null,
  target_count int not null default 1 check (target_count >= 1),
  unit text,
  weekdays text[] not null default '{}',    -- subset of mon..sun (ISO order)
  generated_parent_id uuid references public.quest on delete cascade,
  calendar_sync bool not null default false,
  reminder_time time,
  active_from date not null default current_date,
  active_to date,
  archived bool not null default false,
  created_at timestamptz not null default now()
);

-- quest_instance (one occurrence per period)
create table public.quest_instance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  quest_id uuid not null references public.quest on delete cascade,
  period_key text not null,
  progress int not null default 0 check (progress >= 0),
  target_count int not null,
  completed bool not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quest_id, period_key)
);

-- quest_event (idempotent event ledger)
create table public.quest_event (
  id uuid primary key,                      -- client-generated; idempotency key
  user_id uuid not null references public.user_profile on delete cascade,
  instance_id uuid not null references public.quest_instance on delete cascade,
  kind event_kind not null,
  delta int not null,
  created_at timestamptz not null default now()
);

-- xp_event (XP ledger; balance = sum)
create table public.xp_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  source_instance_id uuid references public.quest_instance on delete set null,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- streak (one row per quest)
create table public.streak (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  quest_id uuid not null references public.quest on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  last_period_key text,
  unique (quest_id)
);

-- sleep_log
create table public.sleep_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  night_of date not null,
  hours numeric(3,1) not null check (hours >= 0 and hours <= 24),
  created_at timestamptz not null default now(),
  unique (user_id, night_of)
);

-- calendar_link (maps quest → Google Calendar event)
create table public.calendar_link (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  quest_id uuid not null references public.quest on delete cascade,
  google_event_id text,
  state text not null default 'pending',    -- none|pending|synced|error
  updated_at timestamptz not null default now(),
  unique (quest_id)
);

-- ############################################################################
-- §3 — INDEXES
-- ############################################################################
create index on public.quest (user_id, habit_id);
create index on public.quest_instance (user_id, period_key);
create index on public.xp_event (user_id, created_at);
create index on public.sleep_log (user_id, night_of);

-- ############################################################################
-- §4 — ROW-LEVEL SECURITY
-- ############################################################################
alter table public.user_profile   enable row level security;
alter table public.user_settings  enable row level security;
alter table public.habit          enable row level security;
alter table public.quest          enable row level security;
alter table public.quest_instance enable row level security;
alter table public.quest_event    enable row level security;
alter table public.xp_event       enable row level security;
alter table public.streak         enable row level security;
alter table public.sleep_log      enable row level security;
alter table public.calendar_link  enable row level security;

-- user_profile (uses id = auth.uid())
create policy "own rows - select" on public.user_profile
  for select using (id = auth.uid());
create policy "own rows - modify" on public.user_profile
  for all using (id = auth.uid()) with check (id = auth.uid());

-- user_settings
create policy "own rows - select" on public.user_settings
  for select using (user_id = auth.uid());
create policy "own rows - modify" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- habit
create policy "own rows - select" on public.habit
  for select using (user_id = auth.uid());
create policy "own rows - modify" on public.habit
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- quest
create policy "own rows - select" on public.quest
  for select using (user_id = auth.uid());
create policy "own rows - modify" on public.quest
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- quest_instance
create policy "own rows - select" on public.quest_instance
  for select using (user_id = auth.uid());
create policy "own rows - modify" on public.quest_instance
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- quest_event: INSERT allowed so clients can write events; RPC handles dedupe
create policy "own rows - select" on public.quest_event
  for select using (user_id = auth.uid());
create policy "own rows - insert" on public.quest_event
  for insert with check (user_id = auth.uid());
create policy "own rows - update" on public.quest_event
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- xp_event: READ only — writes are ONLY via definer RPCs (no INSERT/UPDATE/DELETE policy)
create policy "own rows - select" on public.xp_event
  for select using (user_id = auth.uid());

-- streak
create policy "own rows - select" on public.streak
  for select using (user_id = auth.uid());
create policy "own rows - modify" on public.streak
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- sleep_log
create policy "own rows - select" on public.sleep_log
  for select using (user_id = auth.uid());
create policy "own rows - modify" on public.sleep_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- calendar_link
create policy "own rows - select" on public.calendar_link
  for select using (user_id = auth.uid());
create policy "own rows - modify" on public.calendar_link
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ############################################################################
-- §5 — HELPER FUNCTIONS
-- ############################################################################

-- Period key for a given cadence and date (docs/05 §1).
create or replace function public.period_key_for(c cadence, d date)
returns text language sql immutable strict as $$
  select case c
    when 'daily'   then to_char(d, 'YYYY-MM-DD')
    when 'weekly'  then to_char(d, 'IYYY-"W"IW')
    when 'monthly' then to_char(d, 'YYYY-MM')
    when 'yearly'  then to_char(d, 'YYYY')
  end;
$$;

-- Compute the next period key after a given one for a cadence.
create or replace function public.next_period_key(current_key text, c cadence)
returns text language sql immutable strict as $$
  select case c
    when 'daily'   then to_char((current_key::date + interval '1 day')::date, 'YYYY-MM-DD')
    when 'weekly'  then to_char((to_date(current_key, 'IYYY-"W"IW') + interval '7 days')::date, 'IYYY-"W"IW')
    when 'monthly' then to_char((to_date(current_key || '-01', 'YYYY-MM-DD') + interval '1 month')::date, 'YYYY-MM')
    when 'yearly'  then to_char((to_date(current_key || '-01-01', 'YYYY-MM-DD') + interval '1 year')::date, 'YYYY')
  end;
$$;

-- Compute XP for a completion (docs/05 §5):
--   BASE_COMPLETE = 10
--   STREAK_BONUS(s) = min(streak, 7) * 2
--   CADENCE_MULT = { daily:1.0, weekly:2.0, monthly:4.0, yearly:8.0 }
create or replace function public.compute_xp(
  streak_current int,
  q_cadence cadence
) returns int language sql immutable strict as $$
  select round(
    (10 + (least(coalesce(streak_current, 0), 7) * 2)) *
    (case q_cadence
      when 'daily'   then 1.0
      when 'weekly'  then 2.0
      when 'monthly' then 4.0
      when 'yearly'  then 8.0
    end)
  )::int;
$$;

-- ############################################################################
-- §6 — RPCs (the API surface clients call — security definer)
-- ############################################################################

-- 6a. apply_quest_event
-- Idempotent: dedupe by quest_event.id (client UUID).
-- Updates quest_instance.progress/completed; on completion grants XP + updates streak.
-- Returns JSON with {applied, instance, xp_granted, streak_after}.
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
      'streak_after', coalesce((select current from public.streak where quest_id = qi.quest_id), 0)
    ) into v_result
    from public.quest_instance qi where qi.id = p_instance_id;
    return v_result;
  end if;

  -- Resolve user, quest, and cadence from the instance
  select qi.user_id, qi.quest_id, q.cadence, qi.progress, qi.target_count, qi.period_key
    into strict v_user_id, v_quest_id, v_cadence, v_old_progress, v_target, v_period_key
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
    -- Read or initialise streak for this quest
    select current, longest, last_period_key
      into v_streak_current, v_streak_longest, v_streak_last
      from public.streak where quest_id = v_quest_id;

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
      values (v_user_id, v_quest_id, v_streak_new_current, v_streak_longest, v_period_key)
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
      from public.streak where quest_id = v_quest_id;
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

-- 6b. ensure_instances
-- Materialise quest_instance rows for a user on a given date.
-- Idempotent via unique (quest_id, period_key).
-- Implements docs/05 §3 (Instance materialisation).
create or replace function public.ensure_instances(p_user_id uuid, p_date date default current_date)
returns void
language plpgsql
security definer
as $$
declare
  v_rec record;
  v_period_key text;
  v_target int;
  v_dow int;
  v_weekday_map text[] := array['mon','tue','wed','thu','fri','sat','sun'];
begin
  for v_rec in
    select q.* from public.quest q
    where q.user_id = p_user_id
      and q.archived = false
      and q.active_from <= p_date
      and (q.active_to is null or q.active_to >= p_date)
  loop
    if v_rec.cadence = 'daily' then
      -- Generated child with exactly 1 weekday: only produce if that weekday matches today
      if v_rec.generated_parent_id is not null and array_length(v_rec.weekdays, 1) = 1 then
        v_dow := extract(isodow from p_date)::int;  -- 1=Mon..7=Sun
        if v_weekday_map[v_dow] != v_rec.weekdays[1] then
          continue;
        end if;
      end if;
      v_period_key := public.period_key_for('daily'::cadence, p_date);
    elsif v_rec.cadence in ('weekly', 'monthly', 'yearly') then
      -- Aggregate parent quest produces one instance per period
      v_period_key := public.period_key_for(v_rec.cadence, p_date);
    else
      continue;
    end if;

    begin
      insert into public.quest_instance (user_id, quest_id, period_key, progress, target_count, completed)
        values (p_user_id, v_rec.id, v_period_key, 0, v_rec.target_count, false);
    exception when unique_violation then
      -- Already exists — idempotent
    end;
  end loop;
end;
$$;

-- 6c. generate_child_quests
-- From a weekly+ quest with weekdays, create/ensure its daily child quests.
-- Implements docs/05 §2 (Quest generation).
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
  if v_parent.cadence not in ('weekly', 'monthly', 'yearly') then
    raise exception 'generate_child_quests: parent cadence must be weekly or higher';
  end if;

  if v_parent.weekdays is null or coalesce(array_length(v_parent.weekdays, 1), 0) = 0 then
    return;  -- no weekdays → no children
  end if;

  foreach v_weekday in array v_parent.weekdays
  loop
    -- Check if child already exists (match on generated_parent_id + weekday)
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

-- 6d. log_sleep
-- Upsert a sleep_log entry (unique on user_id + night_of).
create or replace function public.log_sleep(
  p_user_id uuid,
  p_night_of date,
  p_hours numeric(3,1)
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row record;
begin
  insert into public.sleep_log (user_id, night_of, hours)
    values (p_user_id, p_night_of, p_hours)
    on conflict (user_id, night_of) do update set
      hours = excluded.hours,
      created_at = now()
    returning id, night_of, hours into v_row;
  return jsonb_build_object('id', v_row.id, 'night_of', v_row.night_of, 'hours', v_row.hours);
end;
$$;

-- ############################################################################
-- §7 — NEW-USER BOOTSTRAP TRIGGER
-- ############################################################################
-- On auth.users insert → create user_profile + user_settings.
-- Client onboarding creates the first habit/quest (so user chooses name/colour).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_profile (id, email, display_name)
    values (new.id, new.email, split_part(new.email, '@', 1));
  insert into public.user_settings (user_id)
    values (new.id);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ############################################################################
-- ✓ PHASE A COMPLETE
-- See docs/06 §B1 for Validation Request format.
-- ############################################################################

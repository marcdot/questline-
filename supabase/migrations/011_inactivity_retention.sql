-- ============================================================================
-- Questline — inactivity-based retention (additive migration #011)
-- Art. 5(1)(e): erase accounts after 12 months of inactivity.
-- Additive: one column + two activity-touch triggers + admin-only functions.
-- NOTHING auto-runs here — pg_cron scheduling + the 30-day warning email are
-- wired separately. Defining these is inert; no user is deleted until a cron
-- job calls delete_inactive_users().
-- ============================================================================

-- §1 — last_active_at. Default now() => every EXISTING user is "active as of
-- this migration", so no one can be wrongly deleted on day one.
alter table public.user_profile
  add column if not exists last_active_at timestamptz not null default now();

-- §2 — touch it on activity (additive triggers; the big RPCs stay untouched).
-- quest_event insert = any tap/complete/uncomplete; quest_instance insert =
-- app open (ensure_instances runs on home load).
create or replace function public.touch_last_active()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.user_profile set last_active_at = now() where id = new.user_id;
  return new;
end; $$;

drop trigger if exists touch_active_on_event on public.quest_event;
create trigger touch_active_on_event
  after insert on public.quest_event
  for each row execute function public.touch_last_active();

drop trigger if exists touch_active_on_instance on public.quest_instance;
create trigger touch_active_on_instance
  after insert on public.quest_instance
  for each row execute function public.touch_last_active();

-- §3 — the cutoff as a function = single source of truth for "12 months".
create or replace function public.inactivity_cutoff()
returns timestamptz language sql stable as $$
  select now() - interval '12 months';
$$;

-- §4 — read-only selection: users inactive since the cutoff (default 12 months).
create or replace function public.inactive_user_ids(p_cutoff timestamptz default public.inactivity_cutoff())
returns setof uuid language sql stable security definer set search_path = public, auth as $$
  select id from public.user_profile where last_active_at < p_cutoff;
$$;

-- §5 — delete inactive users. Deleting auth.users cascades → full erasure
-- (proven in migration 010's test). Returns how many were deleted.
create or replace function public.delete_inactive_users(p_cutoff timestamptz default public.inactivity_cutoff())
returns integer language plpgsql security definer set search_path = public, auth as $$
declare v_count int := 0; v_id uuid;
begin
  for v_id in select public.inactive_user_ids(p_cutoff) loop
    delete from auth.users where id = v_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

-- Admin/cron only — never callable by app users.
revoke all on function public.inactive_user_ids(timestamptz)    from public, anon, authenticated;
revoke all on function public.delete_inactive_users(timestamptz) from public, anon, authenticated;
grant execute on function public.inactive_user_ids(timestamptz)    to service_role;
grant execute on function public.delete_inactive_users(timestamptz) to service_role;

-- ============================================================================
-- ✓ Migration 011 — inactivity retention (functions only; cron wired separately)
-- ============================================================================

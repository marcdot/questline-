-- ============================================================================
-- Questline — explicit health-data consent (additive migration #013)
-- Art. 9: sleep logs + weight are special-category data; process only with the
-- user's explicit consent, withdrawable at any time. Additive: one column,
-- two guard triggers, one withdrawal RPC.
-- ============================================================================

alter table public.user_settings
  add column if not exists health_consent_at timestamptz;

-- §1 — weight may only exist while consent is held (backstop to the UI gate).
-- ponytail: silent nullify, not an error — weight is a setting, not an action.
create or replace function public.enforce_weight_consent()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Weight is allowed only if the user has consent — check the incoming row OR
  -- the already-stored consent, so an upsert that only updates weight_kg (and
  -- doesn't re-send health_consent_at) doesn't wrongly strip it.
  if new.weight_kg is not null
     and coalesce(
           new.health_consent_at,
           (select health_consent_at from public.user_settings where user_id = new.user_id)
         ) is null
  then
    new.weight_kg := null;
  end if;
  return new;
end; $$;

drop trigger if exists enforce_weight_consent_trg on public.user_settings;
create trigger enforce_weight_consent_trg
  before insert or update on public.user_settings
  for each row execute function public.enforce_weight_consent();

-- Existing rows: clear weight for anyone who hasn't explicitly consented yet.
update public.user_settings set weight_kg = null
  where health_consent_at is null and weight_kg is not null;

-- §2 — sleep logs require consent (blocks log_sleep without it). Raises so the
-- client surfaces it; the UI also gates the form proactively.
create or replace function public.require_health_consent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.user_settings
    where user_id = new.user_id and health_consent_at is not null
  ) then
    raise exception 'health-data consent required' using errcode = '42501';
  end if;
  return new;
end; $$;

drop trigger if exists require_consent_on_sleep on public.sleep_log;
create trigger require_consent_on_sleep
  before insert on public.sleep_log
  for each row execute function public.require_health_consent();

-- §3 — withdraw consent: clear consent + weight, delete sleep logs. Self only.
create or replace function public.withdraw_health_consent()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  update public.user_settings
    set health_consent_at = null, weight_kg = null, updated_at = now()
    where user_id = v_uid;
  delete from public.sleep_log where user_id = v_uid;
end; $$;

revoke all     on function public.withdraw_health_consent() from public, anon;
grant  execute on function public.withdraw_health_consent() to authenticated;

-- ============================================================================
-- ✓ Migration 013 — explicit health-data consent (Art. 9)
-- ============================================================================

-- ============================================================================
-- Questline — 30-day inactivity warning (additive migration #012)
-- Companion to 011: warn users ~30 days before the 12-month deletion. The
-- retention_warn Edge Function sends the email; this defines who to warn.
-- ============================================================================

-- When we last warned this user. Null = never warned.
alter table public.user_profile
  add column if not exists inactivity_warned_at timestamptz;

-- Users inactive past the warning line (default 11 months → ~30 days before the
-- 12-month deletion) who haven't been warned SINCE their last activity. The
-- "< last_active_at" guard auto-resets the warning if they come back and lapse
-- again, and prevents daily re-warning.
create or replace function public.users_to_warn(
  p_warn_cutoff timestamptz default (now() - interval '11 months')
)
returns table(id uuid, email text)
language sql stable security definer set search_path = public, auth as $$
  select p.id, u.email
  from public.user_profile p
  join auth.users u on u.id = p.id
  where p.last_active_at < p_warn_cutoff
    and (p.inactivity_warned_at is null or p.inactivity_warned_at < p.last_active_at);
$$;

revoke all     on function public.users_to_warn(timestamptz) from public, anon, authenticated;
grant  execute on function public.users_to_warn(timestamptz) to service_role;

-- ============================================================================
-- ✓ Migration 012 — inactivity warning selection (email sent by Edge Function)
-- ============================================================================

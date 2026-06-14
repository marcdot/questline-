-- ============================================================================
-- Questline — Rate limiting (additive migration #007)
-- A per-key fixed-window limiter the Edge Functions call to stop abuse of the
-- expensive surfaces (calendar_sync → Google Calendar API, calendar_oauth/start).
-- Service-role only (no client policies), like google_token.
-- ============================================================================

-- §1 — counter table (one row per key, e.g. "<user_id>:calendar_sync")
create table if not exists public.rate_limit (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        int         not null default 0
);
alter table public.rate_limit enable row level security;
-- NO policies: invisible to every client role; only service-role (Edge Functions).

-- §2 — atomic check-and-increment (fixed window).
-- Returns TRUE if the call is ALLOWED (count within p_max for the current window),
-- FALSE if it should be rejected (429). Resets the window when it has elapsed.
create or replace function public.check_rate_limit(
  p_key         text,
  p_max         int,
  p_window_secs int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now   timestamptz := now();
  v_count int;
begin
  insert into public.rate_limit (key, window_start, count)
    values (p_key, v_now, 1)
  on conflict (key) do update set
    count = case
              when rate_limit.window_start < v_now - make_interval(secs => p_window_secs)
              then 1
              else rate_limit.count + 1
            end,
    window_start = case
              when rate_limit.window_start < v_now - make_interval(secs => p_window_secs)
              then v_now
              else rate_limit.window_start
            end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- §3 — only the Edge Functions (service-role) may call this. Stops a client
-- from poking the limiter directly (counter inflation / table bloat).
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- ============================================================================
-- Apply once in the Supabase SQL editor (questline-dev). Additive only.
-- ============================================================================

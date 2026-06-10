-- ============================================================================
-- Questline — Calendar sync infrastructure (additive migration #006)
-- Lead pre-approved in P6-calendar-plan.md LEAD RESPONSE (see android/docs/)
-- Additive only — never modifies existing tables, only creates new ones + drops
-- one policy on calendar_link.
-- ============================================================================

-- ############################################################################
-- §1 — google_token table (service-role only, invisible to clients)
-- ############################################################################
create table if not exists public.google_token (
  user_id uuid primary key references public.user_profile on delete cascade,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_token enable row level security;
-- NO policies at all: invisible to every client role; only service-role
-- (Edge Functions) can read/write. This is the docs/04 §5 "secured table".

-- ############################################################################
-- §2 — Tighten calendar_link RLS
-- ############################################################################
-- Clients can READ calendar_link (select policy stays) but only the Edge
-- Function writes it (service_role bypasses RLS entirely — no policy needed).
drop policy if exists "own rows - modify" on public.calendar_link;

-- ============================================================================
-- ✓ Migration 006 — CALENDAR SYNC INFRASTRUCTURE
-- ============================================================================

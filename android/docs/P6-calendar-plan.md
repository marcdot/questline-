# P6 — Calendar Sync Plan (for lead review)

> Status: **Plan only — no code written.** Schema changes need lead approval per the backend freeze (STATUS.md). This document describes what needs building.

## Architecture

```
User taps "Enable Calendar Sync" in Profile
  → Client requests incremental Google OAuth scope
  → Supabase Auth stores refresh_token in auth.provider_tokens
  → Client calls Edge Function: calendar_sync(quest_id, 'create')
  → Edge Function uses stored refresh_token → Google Calendar API
  → Writes calendar_link row
  → Returns Google event ID

Periodic sync / quest edit → calendar_sync(quest_id, 'update')
Quest delete / sync off → calendar_sync(quest_id, 'delete')
```

## What already exists (no change needed)

| Item | Location | Status |
|------|----------|--------|
| `calendar_link` table + RLS | `supabase/migrations/001_phase_a_full.sql` | ✅ Created, RLS enabled |
| `user_settings.calendar_sync_enabled` | Schema, migration 001 | ✅ Created |
| `quest.calendar_sync` (per-quest opt-in) | Schema, migration 001 | ✅ Created |
| `user_settings.google_connected` | Schema, migration 001 | ✅ Created |
| Edge Function `calendar_sync(quest_id, op)` | `docs/04 §6` definition | ⚠️ **Stub — no implementation** |

## What the Edge Function needs (backend work)

Create `supabase/functions/calendar_sync/index.ts`:

```
POST /functions/v1/calendar_sync
Auth: anon key + Bearer session token
Body: { quest_id: uuid, op: "create" | "update" | "delete" }

1. Extract user_id from auth.uid() (session token)
2. Read refresh_token from auth.provider_tokens (Supabase Auth)
3. If no refresh_token → return 401 "Google Calendar not connected"
4. Fetch quest details (title, habit colour, cadence, weekdays)
5. Call Google Calendar API with stored refresh token:
   - "create" → POST /calendars/primary/events → insert calendar_link
   - "update" → PATCH existing event
   - "delete" → DELETE existing event → remove calendar_link
6. On token expiry (401 from Google) → clear google_connected, return actionable error
```

## Where tokens live

- **User's Google refresh_token** → stored in `auth.provider_tokens` (Supabase-managed, server-side only). Never exposed to the client.
- **Client** never holds, sees, or handles a Google token. It only calls the Edge Function with its Supabase session.
- The Edge Function reads the refresh token via `supabase.auth.getUser().provider_tokens`.

## What the client does (android P6)

1. **OAuth flow**: Call Supabase's `signInWithOAuth` with `{ provider: 'google', options: { scopes: 'https://www.googleapis.com/auth/calendar.events', redirectTo: '...' } }` — incremental scope requested only when user enables sync.
2. **Profile screen toggle**: `user_settings.calendar_sync_enabled` flip → triggers OAuth if not already connected.
3. **Per-quest toggle**: `quest.calendar_sync` boolean → when flipped on, calls Edge Function `calendar_sync(quest_id, 'create')`. When flipped off, calls `calendar_sync(quest_id, 'delete')`.
4. **On quest edit** (title, cadence, weekdays change): call `calendar_sync(quest_id, 'update')`.
5. **On quest delete**: call `calendar_sync(quest_id, 'delete')` before removing.

## Security gates

| Gate | Rule | Verified by |
|------|------|-------------|
| S3 | Refresh token server-side only, never in client | Lead checks Edge Function; grep client for `refresh_token` |
| S3 | Incremental scope — only request calendar.events when user enables sync | Code review of OAuth scope param |
| S5 | No Google client secret in client code | Secret scan before commit |
| RLS | Only the Edge Function (running as definer) can insert to `calendar_link` | Policy spec |

## Approval request

1. ✅ Approve the plan above?
2. Should I implement the Edge Function first (backend, independent of any client), or proceed android P6 client work with the function stubbed?
3. The `calendar_link` RLS currently follows the standard `user_id = auth.uid()` pattern — this needs to allow the Edge Function (running as service_role) to write. Change: `with check (user_id = auth.uid() OR auth.role() = 'service_role')`. Approved?

## Schema change needed

```sql
-- calendar_link RLS: allow Edge Function writes
drop policy if exists "own rows - modify" on public.calendar_link;
create policy "own rows - modify" on public.calendar_link
  for all using (user_id = auth.uid()) with check (
    user_id = auth.uid() OR auth.role() = 'service_role'
  );
```

---

## LEAD RESPONSE — plan REVISED, not approved as written (4 points)

Good instinct writing a plan first — that's exactly what the freeze requires. But the plan has
one fatal assumption and one unnecessary schema change:

**1. ❌ `auth.provider_tokens` DOES NOT EXIST.** Supabase does NOT persist Google provider
tokens server-side; `provider_token`/`provider_refresh_token` appear ONCE in the client session
right after OAuth and are never stored — no table, and `getUser()` cannot fetch them later. The
plan's entire token story collapses on this. **Approved replacement — server-side OAuth code
flow (refresh token NEVER touches any client):**
- Edge Function `calendar_oauth` with two routes: `/start` (returns the Google consent URL with
  `access_type=offline&prompt=consent`, scope `calendar.events`, `state` = signed user ref) and
  `/callback` (exchanges the code using `GOOGLE_CLIENT_SECRET` from Edge Function secrets,
  stores the refresh token, redirects back to the app).
- NEW table (additive migration `006_google_token.sql`, lead pre-approves this draft):
  ```sql
  create table public.google_token (
    user_id uuid primary key references public.user_profile on delete cascade,
    refresh_token text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  alter table public.google_token enable row level security;
  -- NO policies at all: invisible to every client role; only service-role (Edge Functions)
  -- can read/write. This is the docs/04 §5 "secured table".
  ```
- `calendar_sync` reads the refresh token from `google_token` with the service-role client,
  mints an access token, calls Google. On `invalid_grant` (user revoked): delete the row, set
  `user_settings.google_connected=false`, return an actionable 409 — note: refresh tokens don't
  "expire on 401"; revocation is the case to handle.

**2. ❌ The `calendar_link` RLS change is REJECTED — it's unnecessary and signals a
misunderstanding: `service_role` BYPASSES RLS entirely (bypassrls).** The Edge Function can
already write `calendar_link`. **Approved instead (tightening, additive migration):** drop the
client "own rows - modify" policy on `calendar_link` entirely — clients read it (select stays),
ONLY the Edge Function writes it (same model as `xp_event`). Clients toggle `quest.calendar_sync`
and call the Edge Function; they never touch `calendar_link` rows.

**3. Order (your question 2): BACKEND FIRST.** The Edge Function pair + migration 006 serve all
clients (webapp P6 needs them too — build once). Then android P6 client work against the real
function. Note android's in-app flow: opening the `/start` URL in a Custom Tab is fine — the
code exchange still happens server-side.

**4. PREREQUISITE (user action):** Google Cloud Console — the web OAuth client needs the
Calendar API enabled, the `calendar.events` scope on the consent screen, and the Edge Function
callback URL added to authorized redirect URIs. Coordinate with the user before /callback can
be tested; build + unit-test the function first.

**Verdict: revise per 1–4, then GO. Submit migration 006 + the Edge Function as a backend
mini-phase (own VR, runtime evidence: a real consent → token stored → event created round-trip
on a test calendar). S3/S5 gates apply in full.**

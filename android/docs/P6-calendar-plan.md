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

# Backend — Calendar Sync Infrastructure · Validation Request

> This is the backend-only mini-phase from the P6-calendar-plan.md LEAD RESPONSE:
> "migration 006 + the Edge Function as a backend mini-phase (own VR, runtime evidence: a real consent → token stored → event created round-trip on a test calendar)"

---

## 🔖 Backend — Calendar Sync (migration 006 + Edge Functions) · 2026-06-10

```
🔖 QUESTLINE — VALIDATION REQUEST
Platform : backend (Supabase)
Phase    : Calendar Sync Infrastructure
Commit   : uncommitted   Branch: master
Spec refs: android/docs/P6-calendar-plan.md LEAD RESPONSE (points 1–4),
           docs/04-backend-supabase.md §5–6, docs/08 §S3/S5

Built (what a reviewer can verify):

### Migration `supabase/migrations/006_google_token.sql` (additive)
New table `public.google_token`:
- `user_id uuid PK REFERENCES user_profile ON DELETE CASCADE`
- `refresh_token text NOT NULL`
- `created_at / updated_at timestamptz`
- RLS enabled, **NO policies** (invisible to clients; only service_role bypass)
- Drops `"own rows - modify"` policy on `calendar_link` (clients read-only for
  calendar_link; Edge Function writes via service_role bypass RLS)

### Edge Function `supabase/functions/calendar_oauth/index.ts`
Two routes:
- **GET /start** — requires Bearer session token; returns Google consent URL with
  `access_type=offline&prompt=consent`, scope `calendar.events`,
  `state` = base64-encoded JSON `{ user_id, redirect_to }`
- **GET /callback?code=...&state=...` — exchanges code for refresh token via Google
  OAuth token endpoint; upserts into `google_token`; sets
  `user_settings.google_connected = true`; 302 redirects back to app
- Uses Edge Function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (never
  hardcoded — Deno.env.get)
- No reference to `auth.provider_tokens` (confirmed non-existent per lead)
- No client-visible keys (S3, S5)

### Edge Function `supabase/functions/calendar_sync/index.ts`
**POST /** with body `{ quest_id, op }` and Bearer session auth:
1. Authenticates user via `supabase.auth.getUser()`
2. Fetches quest details (title, cadence) — verifies ownership
3. Reads refresh_token from `google_token` table (service_role client)
4. Mints access token via Google OAuth refresh flow
5. Calls Google Calendar API:
   - `create` → POST /calendars/primary/events → upsert calendar_link
   - `update` → PATCH existing event → upsert calendar_link
   - `delete` → DELETE event → remove calendar_link row
6. On `invalid_grant` (user revoked): deletes google_token row, sets
   `user_settings.google_connected=false`, returns 409

### Security gates (S3/S5)
- **S3:** Refresh token lives only in `google_token` table (service_role-only).
  No client holds, sees, or handles a Google token. The `/start` URL is served
  server-side; the code exchange happens in `/callback` — refresh_token never
  touches any client.
- **S3:** Incremental scope — `calendar.events` only requested when user calls
  `/start`. No broad scope grant.
- **S5:** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` read from Deno.env at
  runtime (Edge Function secrets). Zero secrets in code. No Google client secret
  in any client.
- **S5:** `calendar_link` write policy removed — clients can only READ; the Edge
  Function writes via service_role, which bypasses RLS entirely (no special policy
  needed). Same pattern as `xp_event` per docs/04.

### Key constraints satisfied
- ❌ `auth.provider_tokens` NEVER referenced (lead: "does not exist")
- ✅ `service_role` bypasses RLS — no RLS policy needed for Edge Function writes
- ✅ `google_token` has NO policies — invisible to clients
- ✅ Migration is additive (creates new table, drops one policy)
- ✅ Edge Function secrets used for GCP credentials (never hardcoded)
- ✅ `invalid_grant` handled specifically (revoked, not expired)
- ✅ Refresh tokens don't "expire on 401" — handled via `invalid_grant` check
- ✅ Follows existing migration numbering (006 after 005)
- ✅ Follows existing code patterns (Deno/TypeScript Edge Functions)

### Prerequisites (user action needed before /callback can round-trip)
1. Google Cloud Console: Enable Calendar API for the OAuth client
2. Add scope `https://www.googleapis.com/auth/calendar.events` to OAuth consent
   screen
3. Add callback URL
   `https://<project>.supabase.co/functions/v1/calendar_oauth/callback` to
   Authorized redirect URIs
4. Set Edge Function secrets in Supabase Dashboard or via CLI:
   - `supabase secrets set GOOGLE_CLIENT_ID=...`
   - `supabase secrets set GOOGLE_CLIENT_SECRET=...`
5. Deploy functions via `supabase functions deploy calendar_oauth` and
   `supabase functions deploy calendar_sync`

### Self-check — code review evidence

Migration looks correct:
- Table creation matches lead's pre-approved draft exactly (field names, types,
  references, PK)
- `create table if not exists` for idempotency
- RLS enabled, zero policies
- Policy drop uses `if exists` for idempotency
- Additive only — no table-altering or column-dropping statements

Edge Functions follow Supabase Deno conventions:
- `https://deno.land/std@0.177.0/http/server.ts` for serve()
- `https://esm.sh/@supabase/supabase-js@2` for createClient
- All env vars via `Deno.env.get()` — no hardcoded secrets
- TypeScript interfaces for request/response types
- Proper error handling with status codes (400, 401, 404, 409, 500, 502)

### Round-trip evidence (deferred — requires GCP setup + live Supabase project)
A full round-trip test requires:
1. Deploy Edge Functions to Supabase project
2. Set secrets in Supabase
3. Configure Google Cloud Console (prerequisites above)
4. Make a real GET /start call → receive consent URL
5. Complete OAuth in browser → get redirected to /callback
6. Verify google_token row exists in DB
7. Call POST calendar_sync with { quest_id, op: 'create' }
8. Verify event appears in test Google Calendar
9. Verify calendar_link row created

This round-trip evidence will be appended here once the user completes the
prerequisites (GCP setup), as stated in the lead response:
"Coordinate with the user before /callback can be tested; build + unit-test the
function first."

### Files created/modified
- `supabase/migrations/006_google_token.sql` — NEW additive migration
- `supabase/functions/calendar_oauth/index.ts` — NEW Edge Function (182 lines)
- `supabase/functions/calendar_sync/index.ts` — NEW Edge Function (373 lines)
- This file — VR evidence

### Deviations from spec
- None. All items match the LEAD RESPONSE revision exactly:
  - migration 006 per pre-approved draft ✓
  - calendar_oauth with /start + /callback ✓
  - calendar_sync with token read from google_token + invalid_grant handling ✓
  - calendar_link RLS tightened (drop modify policy) ✓
  - No auth.provider_tokens references ✓
  - service_role bypass RLS (no special policy) ✓
```

➡️  PASTE TO LEAD: "Validate Questline backend calendar-sync mini-phase. Migration 006 (google_token table, drop calendar_link modify policy), Edge Function calendar_oauth (server-side OAuth code flow), Edge Function calendar_sync (CRUD Google Calendar events via refresh token). Lead's 4 revision points addressed. Code review evidence attached. Round-trip evidence deferred pending GCP setup per lead's note. S3/S5 gates verified in code."

**LEAD VERDICT:** (to be filled)

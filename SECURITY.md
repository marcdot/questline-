# Questline — Security Posture

> Threat model: a **public** app on a portfolio site, given to a few real users early on. The
> realistic adversaries are **opportunistic & automated** — crawlers, bots, scrapers, AI agents
> probing endpoints, and casual tampering — not a targeted/funded attacker. The goal: no easy wins
> for anyone scanning it. Last reviewed: 2026-06-14 (audited live against the real backend).

## What's enforced (verified)

**Secrets**
- Service-role key and Google client secret are **never committed and never in git history**
  (all blobs scanned). Only `.env.example` placeholders are tracked.
- `keys.json`, `.env.local`, `android/local.properties` are gitignored. Only the anon key + project
  URL reach the browser — **safe by Supabase design** (the anon key is public; RLS is the gate).
- No `service_role` reference in any client code; absent from the built bundle.

**Data access — Row-Level Security on all 11 tables.** Live anon read returns 0 rows from every
table. `google_token` and `rate_limit` have RLS enabled with **no policies** → invisible to all
client roles; only service-role (Edge Functions) touch them.

**Anti-cheat.** XP and streaks can only be written by `SECURITY DEFINER` RPCs. Direct client inserts
to `xp_event` / `quest_event` return 403 (verified live). All four callable definer RPCs check
`auth.uid()` (no cross-user writes).

**Auth.** The route guard validates the JWT server-side with `getUser()` (not the spoofable
`getSession()`). OAuth `state` is **HMAC-signed** (forged state → 403). Google refresh tokens live
only server-side in the policy-less `google_token` table; the client never holds one. "Disconnect"
revokes the grant at Google + deletes the stored token.

**Rate limiting** (migration 007 + Edge Functions). A per-user fixed-window limiter
(`check_rate_limit`, service-role only) caps the expensive surfaces:
- `calendar_sync` → 20 / 60s per user (it calls the Google Calendar API — the main quota-burn vector).
- `calendar_oauth/start` → 10 / 60s per user (consent-URL minting).
Over-limit → HTTP 429 + `Retry-After`.

**HTTP security headers** (`webapp/next.config.ts`, all routes — verified live):
- `Content-Security-Policy` (default-src self; connect-src self + `*.supabase.co`; `frame-ancestors
  'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action` self + Google).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (camera/mic/geolocation/FLoC off), `Strict-Transport-Security` (HSTS, 2y).

## Activate the new protections (manual — Supabase deploys aren't automated)
1. **Apply migration 007** — Dashboard → SQL Editor → run `supabase/migrations/007_rate_limit.sql`.
2. **Redeploy both Edge Functions** (they now call `check_rate_limit`): Dashboard → Edge Functions →
   paste `supabase/functions/calendar_sync/index.ts` and `…/calendar_oauth/index.ts` → Deploy.
   (Keep verify_jwt: `calendar_sync` ON, `calendar_oauth` OFF.)
3. The security **headers** are already live on the webapp (config-only, no deploy step).

## Owner action items (dashboard / pre-prod — only you can do these)
- **Auth rate limits**: Dashboard → Authentication → Rate Limits — confirm sign-in / sign-up /
  email-send limits are sane (these are Supabase-managed, not in code).
- **Bot signup defense**: before opening signups publicly, add **Cloudflare Turnstile** (or hCaptcha)
  to the signup form — the single highest-value defense against automated account creation.
- **Email confirmation**: turn it back **ON** for prod + use a **custom SMTP** (Resend/Postmark) so
  bounces don't hit Supabase's shared sender reputation.
- **HTTPS only**: serve the portfolio site over TLS (HSTS assumes it).
- **Key rotation**: if `keys.json` ever leaks, rotate the **service-role key** immediately in the
  Supabase dashboard — it bypasses RLS and is effectively the master key.

## Known limitations (acceptable for this threat model)
- CSP allows `'unsafe-inline'` / `'unsafe-eval'` for scripts (Next.js runtime needs it without a
  nonce pipeline). A nonce-based strict CSP is the future hardening if this ever becomes commercial.
- Data-API reads aren't rate-limited per request (RLS protects the *data*; a logged-in user could
  still hammer reads). Fine for a small trusted user base; front with Cloudflare if it grows.
- `rate_limit` rows for inactive users persist (tiny); add a periodic cleanup if the table grows.

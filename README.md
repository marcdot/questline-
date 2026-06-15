# Questline

**A gamified habit tracker that turns daily routines into quests.** Keep long-lived
**habits** (Run, Read, Meditate) alive by completing time-boxed **quests** — one tap for
progress, a press-and-hold to complete. Every completion grants XP, advances a streak, and
can sync to Google Calendar.

🔗 **Live:** [questline.marcdot.site](https://questline.marcdot.site) · installable as a
PWA ("Add to Home Screen" on iOS/Android)

> A full-stack, multi-platform product: a deployed Next.js web app + installable PWA, a
> hardened Supabase backend (Postgres + RLS + Edge Functions), and a shared design system —
> with security, anti-cheat, and gamification logic built to production standards.

---

## Features

- **Tap = +1, hold = complete** — a tactile "ember fill" interaction with optimistic UI and an
  offline queue that syncs when you reconnect.
- **Gamification engine** — XP scales with streak length and quest cadence; streaks roll over
  per ISO period; an idempotent event ledger makes every action exactly-once.
- **Google Calendar sync** — quests with sync enabled create/update/delete real calendar events
  via a server-side OAuth flow (tokens never touch the client).
- **Stats** — XP-over-time chart, per-habit streaks, quest-status grid, and a sleep heatmap.
- **Sleep logging** and at-a-glance dashboard metrics.
- **Light / dark** themes with a warm, paper-grained "liquid glass" aesthetic.
- **Installable PWA** — on iOS the app runs in a standalone app-shell with a docked tab bar.

## Tech stack

| Layer | Stack |
|---|---|
| Web client | **Next.js 16**, **React 19**, **Tailwind CSS v4**, **Framer Motion**, TypeScript |
| Backend | **Supabase** — Postgres, Auth (email + Google OAuth), Row-Level Security, **Edge Functions** (Deno) |
| Android client | **Kotlin + Jetpack Compose** (same shared backend) |
| iOS | the web app as a **PWA** (no native app) |
| Hosting | **Vercel** (web), Supabase (DB + functions), Cloudflare **Turnstile** (bot protection) |

## Security

Security was treated as a first-class requirement, not an afterthought:

- **Row-Level Security on every table** — the public anon key is safe to ship because RLS is the
  gate; clients can only ever read/write their own rows.
- **Anti-cheat** — XP and quest-event ledgers are **write-blocked to clients**; all mutations go
  through `SECURITY DEFINER` RPCs guarded by `auth.uid()`, so a user can't grant themselves XP.
- **Secrets stay server-side** — Google refresh tokens live in a service-role-only table with
  **no client policies**; the browser never sees a token.
- **HMAC-signed OAuth state** — the calendar OAuth flow signs its state parameter to reject
  forged callbacks.
- **Rate limiting** — a `check_rate_limit` RPC (service-role only) throttles the Edge Functions;
  Supabase auth limits + **Cloudflare Turnstile** guard signup/login from bots.
- **Hardened headers** — CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy,
  Permissions-Policy on every response.
- **Email confirmation** via custom SMTP on a verified sending domain.

See [`SECURITY.md`](SECURITY.md) and [`docs/08-security-qa-testing.md`](docs/08-security-qa-testing.md).

## Gamification engine

The interesting domain logic lives server-side and is unit-tested:

- **XP** rewards consistency: a base award scaled by current streak (capped) and the quest's
  cadence multiplier.
- **Streaks** advance or reset based on the canonical **`period_key`** (ISO week-based year for
  weekly quests), so week boundaries are correct across years.
- **Idempotent ledgers** — `quest_event` and `xp_event` are append-only with client-generated
  idempotency keys; the XP balance is `SUM(xp_event)`, so retries and offline replays never
  double-count.

Algorithms are specified in [`docs/05-gamification-rules.md`](docs/05-gamification-rules.md).

## Project structure

```
questline/
├── webapp/      Next.js 16 web app + PWA (the deployed client)
├── android/     Kotlin / Jetpack Compose client
├── ios/         PWA app-shell plan (code lives in webapp/)
├── supabase/    migrations + Edge Functions (calendar OAuth, calendar sync, rate limit)
├── docs/        architecture, data model, design system, security, gamification rules
├── DESIGN.md / DESIGN-SYSTEM.md / design.html   the design system + live token preview
└── SECURITY.md  security posture & go-live checklist
```

## Running the web app locally

**Prerequisites:** Node 18+ and a Supabase project.

```bash
cd webapp
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

Required environment variables (`webapp/.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<cloudflare turnstile site key>   # optional in dev
```

The Supabase schema and Edge Functions live in [`supabase/`](supabase/) (migrations + Deno
functions deployed via the Supabase dashboard).

```bash
npm run test    # unit tests (domain logic, gamification)
npm run lint    # eslint
npm run build   # production build
```

## Deployment

- **Web app** → Vercel (root directory `webapp/`), custom domain `questline.marcdot.site`.
- **Backend** → Supabase: SQL migrations + two Edge Functions (`calendar_oauth`, `calendar_sync`)
  with `verify_jwt` off + CORS, authenticating requests inside the function.
- **DNS / email** → Cloudflare Turnstile for bot protection; transactional email via SMTP on a
  verified subdomain.

The complete production checklist is in
[`docs/11-golive-calendar-security.md`](docs/11-golive-calendar-security.md).

## How it was built

Questline was built through an AI-orchestrated pipeline: a planning layer produced
zero-knowledge specs (`docs/`, `*/BUILD.md`), a build agent implemented each phase, and a
reviewer validated every phase against acceptance checklists and security gates before it was
accepted. The process is documented in [`PLAN.md`](PLAN.md) and
[`docs/06-agent-protocol.md`](docs/06-agent-protocol.md).

---

*Questline is a personal portfolio project.*

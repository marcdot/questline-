# 01 — System Architecture

> How the three independent clients relate to the one shared backend. Platform‑agnostic.

## 1. Shape

```
        ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
        │   webapp    │   │   android   │   │     ios     │
        │ Next.js 16  │   │ Kotlin/     │   │ = webapp as │
        │ React 19    │   │ Compose     │   │ PWA + app-  │
        │             │   │             │   │ shell mode  │
        └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
               │  HTTPS (Supabase client SDK / REST + JWT)  │
               └──────────────────┬─────────────────────────┘
                                  ▼
                        ┌──────────────────┐
                        │     Supabase     │
                        │  Postgres + RLS  │   ← single source of truth for data
                        │  Auth (email +   │
                        │  Google OAuth)   │
                        │  Edge Functions  │   ← Google Calendar sync runs here
                        └────────┬─────────┘
                                 │ Google Calendar API (server‑side, user token)
                                 ▼
                        ┌──────────────────┐
                        │  Google Calendar │
                        └──────────────────┘
```

## 2. Why this shape

- **Clients are thin and independent.** Each owns its UI + local cache + offline queue. None imports
  another. They agree only on the **data model** (`02`) and the **backend API** (`04`).
- **One backend, one truth.** All business‑critical invariants (ownership, who can read what) are
  enforced server‑side by Postgres **Row‑Level Security**, not trusted to clients.
- **Calendar sync lives server‑side** (Supabase Edge Function), so the Google refresh token never
  touches client storage and sync survives the app being closed.

## 3. Responsibilities

| Concern | Owner | Notes |
|---|---|---|
| UI, navigation, animation, haptics | each client | platform‑native, not shared |
| Local cache + offline write queue | each client | so tap/hold feels instant offline |
| Optimistic XP/streak update | each client | server reconciles; see `05` |
| Identity & sessions | Supabase Auth | JWT; clients store session per platform norms |
| Data persistence + access rules | Supabase Postgres + RLS | `04` |
| Quest auto‑generation (weekly→daily) | **server** (scheduled fn) + client fallback | canonical in `05`; server is authoritative |
| XP/streak source of truth | **server** (computed/stored) | clients optimistic, server authoritative |
| Google Calendar push/pull | Supabase Edge Function | `04` §Calendar |

## 4. Offline & sync model (all clients implement the same rules)

1. **Reads**: client renders from local cache, then refreshes from Supabase.
2. **Writes** (tap +1, complete, create, sleep log): apply **optimistically** to local cache, enqueue,
   flush to Supabase when online.
3. **Conflict rule**: quest progress is a **counter with idempotency** — each completion/increment
   carries a client‑generated `event_id` (UUID). Server dedupes by `event_id`, so a replayed offline
   queue can't double‑count. (See `02` `quest_event` + `05` §Idempotency.)
4. **XP/streak**: client shows an optimistic value immediately; on next sync it adopts the server's
   authoritative value. They must converge — never let the client's number be sticky.

## 5. Environments

| Env | Supabase project | Used by |
|---|---|---|
| `dev` | `questline-dev` | local builds, the build agents |
| `prod` | `questline-prod` | released apps |

Secrets (URL, anon key, service‑role key, Google client id/secret) are configured per `04` and **never
committed**. Each client reads only its **anon key** + URL from env; service‑role key is used only
inside Edge Functions.

## 6. Versioning the contract

The data model (`02`) and API (`04`) carry a `CONTRACT_VERSION`. Clients send it as a header. Changes
are **additive** within a major version. A breaking change bumps the major and is a lead‑approved event
(it touches every client). See `02` header.

## 7. Tech baselines (locked)

| Client | Language / framework | Min target | Key libs |
|---|---|---|---|
| webapp | Next.js 16 + React 19, TypeScript, Tailwind v4 | modern evergreen browsers | `@supabase/supabase-js`, Framer Motion, a charts lib (see `webapp/BUILD.md`) |
| android | Kotlin, Jetpack Compose | Android 9 (API 28)+ | `supabase-kt`, Compose, DataStore/Room, Vico charts |
| ios | **Web-based**: the webapp installed as a PWA + iPhone app-shell mode (no Swift) | iOS 17+ Safari (16.4 floor for push) | same codebase as webapp; `ios/BUILD.md` iP0–iP7 |

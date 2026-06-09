# Webapp — Build Spec

> Platform: **Next.js 16 + React 19 + TypeScript + Tailwind v4 + Framer Motion**, talking to the shared
> Supabase backend (`../docs/04`). Build in phases P0–P7. After each phase: commit + Validation Request
> (`../docs/06`). This file is self‑contained for the *how‑to‑build*; the contracts live in `../docs/`.

## 0. Ground rules specific to this Next.js

⚠️ **This is NOT the Next.js you know.** This repo's Next.js (v16) has breaking changes vs older
training data. **Before writing routing/server code, read the relevant guide in**
`C:\Users\Cutom\Desktop\app\node_modules\next\dist\docs\` (start at `index.md`, then `01-app`). Heed
deprecation notices. Match the versions already used in the parent repo's `package.json`
(`next 16.2.6`, `react 19`, `tailwindcss v4`, `framer-motion 12`).

## 1. Where it lives & how it runs

- Location: `questline/webapp/` as its **own** Next.js app (independent of the parent portfolio app).
- Package manager: npm. Run dev: `npm run dev` (document the exact port in `TASKS.md`).
- Env: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Commit only
  `.env.local.example`. No service‑role key in the web client, ever.

## 2. Recommended structure

```
webapp/
├── app/                    # App Router
│   ├── (auth)/login/…      # auth screens
│   ├── (app)/              # authed shell with bottom nav
│   │   ├── page.tsx        # Home
│   │   ├── habits/…  stats/…  profile/…
│   │   └── layout.tsx      # bottom nav + providers
│   └── layout.tsx  globals.css
├── components/             # QuestCard, AddSheet, SleepChart, BottomNav, pills…
├── lib/
│   ├── supabase/           # browser + server clients, typed
│   ├── domain/             # period keys, xp, streaks — PORT of docs/05 (single source in code)
│   ├── sync/               # optimistic cache + offline queue (idempotent events)
│   └── types.ts            # mirrors docs/02 exactly
└── ...
```

## 3. Libraries

- `@supabase/supabase-js` (auth + data). Use `@supabase/ssr` patterns for the App Router per the Next
  docs you read in §0.
- `framer-motion` for the gamification motion (already in the parent repo).
- Charts: `recharts` or a lightweight SVG you control — the sleep chart + XP graph. Pick one, note it.
- Keep dependencies minimal; justify each in `TASKS.md`.

## 4. Phases (each ends with commit + Validation Request)

### P0 — Scaffold + run
Scaffold the Next 16 app (read §0 docs first), Tailwind v4, Framer Motion, base layout + `globals.css`
with the `docs/03` tokens as CSS variables for light/dark. One placeholder Home screen renders. Lint
clean. Write `TASKS.md` "State of the world" (run cmd, port). → Validate.

### P1 — Data layer + backend wiring  (read `../docs/04` + `../docs/02` now)
- `lib/types.ts` mirroring `docs/02` (enums, tables). Typed Supabase client.
- Read path: fetch the user's habits + today's quest instances (call `ensure_instances` then read).
- Write path: a thin client that calls `apply_quest_event` (idempotent, UUID per event) and `log_sleep`.
- `lib/domain/` ports `docs/05` (period keys, xp, streaks) with **unit tests** against the worked
  example (`docs/05 §8`). → Validate.

### P2 — Auth + onboarding
Login/sign‑up (email + Google via Supabase). Authed route group guards. First‑run onboarding: create
first habit (name + colour picker) + first quest, seed today's instance. Session persists. → Validate.

### P3 — Home + quest interaction  (read `../docs/05` fully)  ← spend the most time here
Build the QuestCard and the home dashboard to the `docs/03 §5` motion spec:
- Tap = +1 (optimistic, <100ms, `+1` float, progress fill in habit colour).
- Hold = complete (visible fill ~450–600ms → completion burst, checkmark draw, XP + streak count‑up).
- Optimistic XP/streak using `lib/domain`, reconciled from server on next read.
- Offline queue: events buffer and flush; no double‑count (idempotency key).
- Mini dashboard (today status, streak, XP) + compact month sleep chart.
→ Validate (strict — feel is gated, see `docs/07 P3`).

### P4 — Quick‑add (+)
AddSheet with New Habit / New Quest / Log Sleep. Quest cadence + optional weekdays + calendar toggle;
weekly+weekdays triggers `generate_child_quests`; children appear on home on the right days. Sleep
upsert. → Validate.

### P5 — Stats
Period + habit filters; XP graph; streaks (incl. longest per habit, colour‑coded); habit/quest status
grid; sleep heatmap. Interactions per `docs/00`. → Validate.

### P6 — Profile/Settings + Calendar sync
Profile + habit editing (colour propagates). Reminders toggle. Google Calendar: connect (incremental
scope), per‑quest selection, master toggle → calls the `calendar_sync` Edge Function (`docs/04`). Token
stays server‑side. Export/import; delete with feedback; theme; XP display mode. → Validate.

### P7 — Polish + a11y + acceptance
Empty/loading/error/offline states; accessibility (`docs/03 §7`); reduce‑motion; responsive (mobile‑
first, works to desktop). All `docs/07` boxes green; clean‑clone README works. → Final Validate.

## 5. Definition of done (web)
Every `../docs/07` box for web green + Lead final PASS. Runs from a clean clone with only the two env
vars. No secrets committed. Reproduces the `docs/05 §8` numbers.

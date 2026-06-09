# Android — Task Ledger (the build agent's durable memory)

> Per `../docs/06 §A2`: this is your memory, not your context window. Keep "State of the world"
> current. A fresh agent should resume from this file alone.

## State of the world
- Status: NOT STARTED.
- Build/run: _(fill at P0, e.g. `./gradlew :app:assembleDebug` + install on emulator)_
- Config needed: `SUPABASE_URL`, `SUPABASE_ANON_KEY` via `local.properties`/`BuildConfig` (not committed).
- Backend: shared Supabase (`../docs/04`) — must exist before P1. Same project as webapp.
- What works: nothing yet.  What's stubbed: n/a.  Next: P0.

## Phase checklist (mark [x] when the Lead returns PASS)
- [ ] P0 — Scaffold + run
- [ ] P1 — Data layer + backend wiring
- [ ] P2 — Auth + onboarding
- [ ] P3 — Home + quest interaction (core)
- [ ] P4 — Quick‑add (+)
- [ ] P5 — Stats
- [ ] P6 — Profile/Settings + Calendar sync
- [ ] P7 — Polish + a11y + acceptance

## Log (one line per meaningful step)
- _(empty)_

## Decisions made (mechanical)
- _(empty)_

## Open questions for the Lead
- _(empty)_

# Webapp — Task Ledger (the build agent's durable memory)

> Per `../docs/06 §A2`: this is your memory, not your context window. Keep the "State of the world"
> block current. Tick items as you go. A fresh agent should be able to resume from this file alone.

## State of the world
- Status: NOT STARTED.
- Run command: _(fill at P0, e.g. `npm run dev` on port 3000)_
- Env needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local`).
- Backend: shared Supabase (`../docs/04`) — must exist (Plan Phase A) before P1.
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

## Log (append one line per meaningful step: file touched / decision / verify result)
- _(empty)_

## Decisions made (mechanical — note them; product decisions go to the Lead instead)
- _(empty)_

## Open questions for the Lead (mirror what you put in Validation Requests)
- _(empty)_

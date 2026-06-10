# iOS — Task Ledger  (WEB-BASED: PWA + app-shell mode)

> Per `../docs/06 §A2`: durable memory, not context window. Keep "State of the world" current.

## State of the world
- Status: ACTIVE — iP0 cleared to run in parallel with webapp-P0 (additive files only).
- Approach: NO native app. Webapp (`../webapp/`) + PWA manifest + iPhone app-shell mode.
  Full spec: `BUILD.md` (read the "iOS realities" table before coding).
- Code location: ALL code in `../webapp/`. This folder = plan + ledger + HANDOFF only.
- Backend: shared Supabase (`../docs/04`) — nothing iOS-specific server-side (except optional
  iP6 push Edge Function).
- Dependencies: iP1←wP0 · iP3←wP2 · iP4/iP5←wP3 · iP6←wP6 · iP7←wP7.

## Phase checklist (mark [x] when the Lead returns PASS)
- [ ] iP0 — PWA baseline (manifest, icons, platform.ts) — ADDITIVE FILES ONLY
- [ ] iP1 — App-shell wiring (meta, safe areas, bottom tabs in standalone)
- [ ] iP2 — Install UX (banner + A2HS sheet, splash)
- [ ] iP3 — Standalone auth (real-device OAuth round-trip)
- [ ] iP4 — Core-loop touch polish (gesture isolation, 60fps Ember Fill, audio unlock)
- [ ] iP5 — Offline shell + idempotent replay queue
- [ ] iP6 — Web Push reminders (optional — may be descoped)
- [ ] iP7 — Device QA + Lighthouse + acceptance

## Log
- _(empty)_

## Decisions made (mechanical)
- _(empty)_

## Open questions for the Lead
- _(empty)_

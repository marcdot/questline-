# Questline — STATUS (resume anchor)

> Read this first to resume the project in any new session. The plan is designed so a fresh agent
> needs **only the repo + these docs** — no prior chat memory. Last updated: 2026-06-07.

## Where we are
- ✅ Full plan written & committed (`docs/00–09`, `PLAN.md`, `README.md`).
- ✅ Design system done + verified live: `DESIGN.md` (tokens) · `DESIGN-SYSTEM.md` · `design.html`.
  Direction LOCKED = **"Spring/Summer restraint, warm undertone"** (near-monochrome warm-grey + one
  ember accent; Bricolage Grotesque display). Signature = **Ember Fill** (hold-to-complete).
- ✅ Git: local repo at `C:\Users\Cutom\Desktop\app\questline` (branch `master`). Commits:
  `c80febb` initial, `9f5b891` retone. **No remote yet.**
- ✅ Hermes handoff written: `brain/Brain/_Claude/handoffs/questline-backend-and-p0.md`.
- ✅ Task 1 (Backend Phase A) — **PASSED & FROZEN** (lead verdict round 3, 2026-06-10). Commits
  `c560df5` + `47aca68` + `622bbee` (migrations 001–005). All 4 definer RPCs auth.uid()-guarded;
  §8 + gap vector + cross-user evidence verified. Contract note added to `docs/02`: `weekdays`
  stored sorted mon→sun. Schema changes from now on: additive migrations w/ lead approval only.
  Clients may wire write RPCs (P1+).
- ✅ iOS approach DECIDED (2026-06-10): **web-based** — the webapp as an installable PWA with an
  iPhone app-shell mode. NO native Swift app. Full plan: `ios/BUILD.md` (iP0–iP7, each gated on a
  webapp phase; only iP0 is parallel-safe — additive files only). Code lives in `webapp/`.
- Verdict board (lead, 2026-06-10 — full verdicts live in each `*/HANDOFF.md`):
  - ✅ webapp **P0 PASS** (`f45be66`) · ✅ android **P0 PASS** (`7218013`, lead re-ran
    assembleDebug+lint fresh) · ✅ ios **iP0 PASS** (`397076a`, PNGs + theme_color + lint fixed)
  - 🔶 webapp **P1 FIX (1)** (`184b79b`): `periodKeyFor('weekly')` uses calendar year, not ISO
    **week-year** → wrong keys at every year boundary (2024-12-30 → `2024-W01`, should be
    `2025-W01`). Backend (`IYYY-IW`) is correct → client/server divergence. Failing probe test
    added by lead: `webapp/lib/domain/__tests__/leadcheck-isoweek.test.ts` — make it pass.
- Order in `webapp/`: (1) P1 ISO fix → P1 PASS, (2) then ios iP1, then webapp P2 (one agent in
  webapp/ at a time). android continues independently → P1 (mind the same ISO week-year trap +
  `weekdays` sorted contract).

## The next step (do this)
1. Tell Hermes: *"Verdicts in the three HANDOFF.md files: android P0 PASS, ios iP0 PASS, webapp
   P1 FIX(1) — the ISO week-year bug; a failing lead probe test sits at
   `webapp/lib/domain/__tests__/leadcheck-isoweek.test.ts`, fix `period-keys.ts` until it's
   green and re-submit. Then ios iP1, then webapp P2. android may start P1 now (use a
   week-year-correct ISO implementation — see the android P0 verdict note)."*
2. From here: one phase → one commit → one VR per stream; lead bulk-reviews additive phases,
   hard gates (P1 contract fidelity, P3 feel, P6 calendar security) get prompt review.

## How to resume in a FRESH session (paste this)
> "You are the Questline project lead. The product lives in `C:\Users\Cutom\Desktop\app\questline`.
> Read `STATUS.md`, `README.md`, `PLAN.md`, `docs/06-agent-protocol.md`, `docs/07-validation-checklists.md`,
> and any `*/HANDOFF.md` files. Then validate the build agents' latest Validation Requests against the
> specs and the git diff, and reply PASS or a numbered FIX list per phase."

A fresh lead re-derives everything from the repo — nothing is lost if this chat ends.

## Validation cadence (so you can batch safely)
Build agents append each phase's Validation Request to `webapp/HANDOFF.md` / `android/HANDOFF.md`, so
they accumulate for a later bulk review. BUT some gates must **not** wait:

| Validate IMMEDIATELY (hard gates — errors compound / security / feel) | Safe to BULK-review |
|---|---|
| Backend Phase A (the shared contract) | P4 quick-add |
| P1 data layer (field/contract fidelity) | P5 stats |
| P3 home + the core tap/hold loop & feel | P7 polish (with P4/P5) |
| P6 Google-Calendar token security | (any additive surface) |

Bulk is lowest-risk when each accumulated Validation Request already carries **fresh command output +
the `docs/05 §8` test vector passing** (Iron Law, `docs/06 §B6`) — the objective gates self-prove, so
the human/lead bulk pass only judges architecture, security and feel. See "why" in the chat / `docs/06`.

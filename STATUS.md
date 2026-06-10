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
- 🔶 Task 1 (Backend Phase A) — Hermes delivered (`c560df5`) + fix round 1 (`47aca68`). Lead
  round-2 verdict: **FIX (2 small items)** but **Task 2 explicitly UNBLOCKED in parallel**. See
  `brain/Brain/_Claude/handoffs/questline-backend-PhaseA-RESULT.md` → "LEAD VERDICT (round 2)":
  (1) `generate_child_quests` missing the `auth.uid()` guard (one line);
  (2) non-first-weekday streak check is unbounded in time (must check THIS week's prev weekday
  date, not "ever completed") + add a gap test vector (Mon-wk1 → skip wk2 → Wed-wk3 ⇒ streak 1, XP 12).
- ✅ iOS approach DECIDED (2026-06-10): **web-based** — the webapp as an installable PWA with an
  iPhone app-shell mode. NO native Swift app. Full plan: `ios/BUILD.md` (iP0–iP7, each gated on a
  webapp phase; only iP0 is parallel-safe — additive files only). Code lives in `webapp/`.
- ⏳ NOT started: client app code (webapp/android/ios-PWA) — now cleared to start (P0/iP0 only).

## The next step (do this)
1. Tell Hermes: *"Read `_Claude/handoffs/questline-backend-PhaseA-RESULT.md` → LEAD VERDICT
   (round 2). Apply fixes #1 and #2, re-run §8 + the new gap vector + cross-user
   generate_child_quests test, re-submit. SIMULTANEOUSLY start Task 2:
   `delegate_task([webapp-P0, android-P0, ios-iP0])` per the updated
   `questline-backend-and-p0.md` — three parallel streams; ios-iP0 is additive-files-only in
   webapp/ (manifest, icons, platform.ts) so it can't collide with webapp-P0."*
2. Phase A formal PASS gate = §8 ✅ + gap vector ✅ + cross-user generate_child_quests → 42501 ✅.
   Clients may NOT wire write RPCs (P1+) until that PASS.
3. Continue each client P1→P7 per `docs/06` (one phase → commit → Validation Request).

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

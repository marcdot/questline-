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
- Client P0 verdicts (lead bulk review, 2026-06-10 — recorded in each `*/HANDOFF.md`):
  - ✅ **webapp P0 PASS** (`f45be66`; build re-run fresh by lead; tokens match DESIGN.md). → P1 go.
  - ⏳ **android P0 PENDING EVIDENCE** (`7218013`; static pre-review positive, but NO Validation
    Request was appended to `android/HANDOFF.md` — Iron Law requires fresh `assembleDebug` output
    there before PASS).
  - 🔶 **ios iP0 FIX (3 items)** (`37c8692`): (1) apple-touch-icon must be PNG (iOS ignores SVG
    home-screen icons) + proper maskable variant; (2) manifest `theme_color` → #F4F2ED;
    (3) iP0 files lint-clean (7 errors at HEAD are in this stream's files).
- ⚠️ Webapp P1 work (`lib/domain/`, `lib/types.ts`) sits UNCOMMITTED — started before P0 PASS.
  Not wasted: commit as the P1 phase with its own VR (incl. docs/05 §8 vector test + lint clean).
  Contract note now in docs/02: `quest.weekdays` written sorted mon→sun.

## The next step (do this)
1. Tell Hermes: *"Lead bulk-reviewed all three P0s — verdicts are in `webapp/HANDOFF.md` (PASS),
   `android/HANDOFF.md` (PENDING EVIDENCE — append the real VR with fresh assembleDebug output),
   and `ios/HANDOFF.md` (FIX ×3: PNG icons, theme_color, lint). Do: (a) android VR, (b) ios iP0
   fixes + re-submit, (c) commit the in-progress webapp P1 as a proper phase with its own VR.
   webapp may proceed P1 now; ios iP1 after the iP0 PASS."*
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

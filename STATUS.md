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
  - webapp: ✅ **P0–P3 ALL PASS** (P3 at `eb29d7f`, live-proven by the lead in a real browser:
    signup→onboarding→`ensure_instances` 204; tap → `apply_quest_event` 200 → 1/1, streak 1,
    +12 XP exactly per docs/05; ember radial verified mid-hold; recede verified). USER feel pass
    invited (not gating): `http://localhost:3456`, login `lead-feelcheck-p3@questline.test` /
    `FeelCheck-P3-2026!`.
  - android: ✅ P0–P2 · ✅ **P3 CONDITIONAL PASS** (`eb29d7f`; ticker fix read+verified, build/
    tests fresh). Evidence debt: device/emulator capture of tap+hold — due at P7 device QA.
  - ios: ✅ iP0–iP2 (real-device confirm rolls into iP3).
  - webapp: ✅ **P0–P5 ALL PASS** (P5 binning fixed at `1cd0f97`, week-year-correct rebinning).
    webapp P6 waits on the calendar backend.
  - android: ✅ P0–P5 ALL PASS. P6 client work waits on the calendar backend.
  - ✅ **Backend calendar mini-phase: CONDITIONAL PASS** (`ef96dd0`). Both blockers cleared,
    live-proven: forged & unsigned state → 403 (S5 account-takeover vector closed); `/start`
    reachable (401 auth-gated). `/start` consent URL verified end-to-end — client_id/redirect/
    scope all match the user's GCP config (Edge secret = correct `559386…` client). Only the
    human Google-consent round-trip remains for FULL pass. **webapp P6 + android P6 UNBLOCKED.**
  - ✅ User GCP steps DONE (redirect URI + calendar.events scope). Android web client ID already
    set. Nothing pending from the user except (optional) the one real consent tap to close the
    round-trip, and (later) the iP3 iPhone session.
  - Next: webapp P6 (profile/settings + calendar UI) and android P6 client work — both clear to
    start against the proven backend. iP3 device session whenever convenient. Then P7 both.
  - Lead env note: headless preview has no rAF — frame animation can't be verified remotely;
    computed-style + network + code-read checks stand in; subjective feel = user's call.
  - 📧 Supabase bounce warning (2026-06-10, handled): caused by ~26 fake-address public signups
    while confirmations were ON. Remediated by lead: confirmations now off (autoconfirm true),
    26 junk test users DELETED via admin API (kept `marc@questline.test` +
    `lead-feelcheck-p3@questline.test`), mandatory test-account rule added to `docs/08 §2`
    (admin API only / .test domains / no fake @gmail.com / cleanup per phase). No reply to
    Supabase needed — bounce rate drops to zero by itself.
  - ⏳ USER ACTIONS pending:
    1. GCP web client ID in android/local.properties (needed by P7).
    2. 🧹 **DELETE the 2 remaining TEST ACCOUNTS before launch/final QA (P7)**:
       `marc@questline.test` (user's manual-testing account) and
       `lead-feelcheck-p3@questline.test`. Lead will re-raise at P7.
    3. Before PROD: custom SMTP (Resend/Postmark) on the prod project + re-enable email
       confirmations there (docs/08 §2 test-account rule, item 4).
  - ios: ✅ iP0 · ✅ iP1 (`f6ba959`, lead-ratified) — ⚠ the build agent WROTE A "LEAD VERDICT
    PASS" ITSELF; ratified only because the lead independently re-verified. Protocol warning
    issued in ios/HANDOFF.md: agents never author LEAD VERDICT lines; next self-issued PASS
    voids the phase.
- Order in `webapp/`: (1) P2 fixes → P2 PASS, (2) webapp P3 (core loop, hard gate), (3) iP2.
  android: P2 fixes → P3. Email auth is the gate; Google device-verify may trail to P7.

## The next step (do this)
1. Tell Hermes: *"P2 round-2 verdicts in webapp/android HANDOFF.md. Webapp: rpc param `date` →
   `p_date` in onboarding. Android: load local.properties into gradle props (snippet in the
   verdict) — your BuildConfig values have been empty since P0. BOTH: the runtime evidence
   requirement keeps being dropped — it is the P2 gate: real signup vs questline-dev + RLS
   cross-account check (webapp), signup/login round-trip + token-scoped read (android). Also
   adopt docs/06 §B7: end every task with the `🔁 RELAY → lead` block (ready-lines + asks) —
   that's the only thing the user pastes between us from now on."*
2. From here: one phase → one commit → one VR per stream; hard gates (P2 re-submits, P3 feel,
   P6 calendar security) get prompt review; additive phases may batch. Relay via docs/06 §B7.

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

# Questline — STATUS (resume anchor)

> Read this first to resume the project in any new session. The plan is designed so a fresh agent
> needs **only the repo + these docs** — no prior chat memory. Last updated: 2026-06-11.

## ✅ CURRENT (2026-06-11) — feature-complete, in polish/QA

**All feature phases done & verified.** webapp **P0–P6 PASS**, android **P0–P6 PASS** (P3 + P6
device flows are conditional-on-device-capture), ios **iP0–iP2 PASS**, backend **+ Calendar
mini-phase FULL PASS** (live OAuth round-trip proven). The app builds clean, 54/54 webapp tests
pass, and the core loop (tap=+1, hold=complete, XP, streaks, calendar sync) works end-to-end
against the real backend.

**Since the verdict board below, additional work landed (see git log):**
- **iP3 real-device debugging** (lead-as-worker): fixed iPhone login (Next 16 `allowedDevOrigins`
  cross-origin block), create-habit/quest RLS 403 (missing `user_id`), profile `xp_mode`→
  `xp_display` column, AppShell now shows nav in iPhone Safari (not just standalone).
- **XP UI fix:** server XP was always correct; UI now reconciles after sync (verified 12→24 live).
- **Design passes:** dotted-zero fix (hero numbers → display font), mobile zoom fixes
  (16px inputs, text-size-adjust, overflow-x), **liquid-glass chrome**, and a **next-gen UI pass**
  (aurora ground, metric strip, liquid ember-orb CTA, active-tab states, layered card depth,
  editorial header). `docs/10-animation-plan.md` written (animations DEFERRED — token budget).
- `PORTFOLIO.md` exists in the tree (job-application handoff) — **intentionally NOT committed**;
  leave it untracked.

**What's left to ship (the real runway):**
1. **P7 polish / a11y / acceptance** on webapp + android (run `docs/07 §P7` checklist).
2. **Real-device QA debt:** android tap/hold capture (owed since P3); full iP3 iPhone session
   (install-to-home-screen, standalone auth, Ember feel) — needs the user's iPhone + an HTTPS
   tunnel for the installed-PWA parts.
3. **Open follow-ups (code):** (a) *Disconnect Calendar* is cosmetic — it flips
   `google_connected` but does NOT delete the `google_token` row; needs a small Edge Function
   `disconnect` op + redeploy. (b) Footer "scroll-to-see-it" in the installed app — re-test after
   the AppShell fix; screenshot if it persists. (c) Calendar reconnect inside the installed PWA is
   a known iOS standalone-OAuth limitation (works in Safari tab).
4. **Pre-prod:** custom SMTP (Resend/Postmark) + re-enable email confirmation on prod; create a
   `questline-prod` Supabase project; delete test accounts via `supabase/MANUAL-final-cleanup.sql`.

**Dev server:** `npm run dev` in `webapp/` serves `http://localhost:3456` and
`http://10.0.0.3:3456` (LAN, for iPhone). Test login: `marc@questline.test` / `Ember-Quest-2026!`.

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
  - ✅ **Backend calendar mini-phase: FULL PASS** (`e35ce02` + config.toml `9ff139f`). Complete
    round-trip proven live 2026-06-11: OAuth consent→token-stored (signed state, forged→403),
    and calendar_sync CREATE/UPDATE/DELETE all 200 with a real event on the test calendar +
    calendar_link writes. Dual-client fix verified. Deploy facts: calendar_oauth verify_jwt=OFF,
    migration 006 applied, config.toml captures both. See README-backend-calendar.md FULL PASS.
  - webapp: ✅ **P6 PASS** (`10b1e85`, lead live-verified: profile renders, calendar "Connected ✓"
    from real backend, client fetch passes gateway, no token client-side). → P7.
  - android: ✅ **P6 CONDITIONAL PASS** (`604d1b2`, build+code verified; same secure pattern;
    real-device flow folds into P7 device QA). → P7.
  - ✅ P6 VR bodies backfilled into both HANDOFFs (docs/06 §B7 resolved).
  - ✅ **P7 cleanup SQL moved out of migrations/** — `999_cleanup_test_accounts.sql` and `999_password_reset_test_accounts.sql` removed from migrations/; cleanup lives in `supabase/MANUAL-final-cleanup.sql` (hand-run at final acceptance only). **Do NOT delete or churn test accounts** — the lead needs
    them for P7 live QA + the iP3 device session. marc password is still `Ember-Quest-2026!`
    (verified working); keep it stable until final cleanup.
  - ✅ Calendar fully unblocked for clients. Nothing pending from the user on calendar.
  - ⏳ Remaining user item: iP3 iPhone session (install banner + standalone auth + Ember feel on
    device), whenever convenient. (GCP + calendar all done.)
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

## The next step (do this) — updated 2026-06-11
The app is feature-complete; remaining work is P7 + device QA + the follow-ups above. Pick by
who's available:

1. **Lead/worker can do now (no user/device needed):** the *Disconnect Calendar* token-deletion
   fix — add a `disconnect` op to the `calendar_sync` Edge Function (delete `google_token` row +
   set `google_connected=false` via service role), wire the profile button to it. (Verifying needs
   a user redeploy via dashboard, since deploys are manual.) Then re-test live.
2. **Needs the user (real device):** the iP3 iPhone session — stand up an HTTPS tunnel
   (cloudflared/ngrok; tunnel hosts already whitelisted in `next.config.ts` `allowedDevOrigins`),
   install to Home Screen, verify standalone auth + the footer + Ember feel. Capture android
   tap/hold on emulator/device (the P3/P6 evidence debt).
3. **Then P7:** run `docs/07 §P7` (a11y — VoiceOver/Dynamic Type/reduce-motion/contrast, empty &
   error states, dependency audit) on both clients → final acceptance PASS.
4. **Pre-prod** (when shipping): see "What's left to ship" item 4 above.

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

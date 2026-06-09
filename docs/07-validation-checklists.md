# 07 — Validation Checklists (what the Lead checks)

> The Lead validates each phase's Validation Request against the relevant block below. A platform is
> DONE only when every box for it is green and the Lead issues a final PASS. These are
> platform‑agnostic acceptance criteria; each `BUILD.md` may add platform‑specific items.
>
> **Every phase also clears its Security/QA gate** (`docs/08 §4`) and provides fresh command‑output
> evidence (Iron Law, `docs/06 §B6`). The security/QA item is listed inline per phase below.

## Phase gates (apply to every platform)

### P0 — Scaffold + run
- [ ] App builds and runs with the documented command; no errors on first screen.
- [ ] Lint/format config present and clean.
- [ ] `.env.example` lists only `SUPABASE_URL` + `SUPABASE_ANON_KEY`; no real secrets committed.
- [ ] `TASKS.md` has a "State of the world" block + run command.

### P1 — Data layer + backend wiring
- [ ] Types/models mirror `docs/02` field names and enums exactly (spot‑check 3 tables).
- [ ] A real read from Supabase renders (e.g. habits list) and a real write persists (verified in DB).
- [ ] Writes go through the RPCs in `docs/04 §6` (no direct `xp_event` writes from client).
- [ ] `CONTRACT_VERSION` sent/handled.
- [ ] **Security/QA:** S1 (no secrets) + S2 (RLS proven with a 2nd account; direct `xp_event` write
      rejected) per `docs/08`; the non‑negotiable unit tests (`docs/08 §1`) are green — output attached.

### P2 — Auth + onboarding
- [ ] Email sign‑up + login work; session persists across app restart.
- [ ] Google sign‑in works.
- [ ] New user gets onboarding that creates first habit (name+colour) and first quest.
- [ ] Logged‑out users can't read another user's data (RLS verified with a second account).
- [ ] **Security/QA:** S3 — sessions in secure storage, no tokens in localStorage/plain prefs (`docs/08`).

### P3 — Home + quest interaction  (THE core — strictest gate)
- [ ] Home foregrounds **quests**, not habits (`docs/00` non‑negotiable).
- [ ] Each quest card shows its **habit colour** (leading bar + progress fill).
- [ ] **Tap = +1**: progress increments, optimistic, <100ms visual response, light haptic, `+1` float.
- [ ] **Hold = complete**: visible fill over ~450–600ms, release at full → completion burst.
- [ ] Completion grants XP (per `docs/05 §5` numbers) and updates streak (`§6`); pills count up.
- [ ] Worked example (`docs/05 §8`) reproduces the exact XP/streak numbers.
- [ ] Mini dashboard shows today status + streak + XP; month sleep chart renders.
- [ ] Offline tap still works and queues; reconciles on reconnect with no double‑count.
- [ ] **Feel**: Lead judges motion/feedback against `docs/03 §5`. Functional‑but‑flat does not pass.
- [ ] **Security/QA:** structured QA pass on the core loop + offline replay (`docs/08 §2`) — evidence attached.

### P4 — Quick‑add (+)
- [ ] New habit: name + colour picker (the `docs/03` palette); persists.
- [ ] New quest: cadence, optional weekdays, calendar toggle; inherits habit colour.
- [ ] Weekly quest with weekdays auto‑generates daily children (`docs/05 §2`); they appear on home on
      the right days only.
- [ ] Log sleep: hours for previous night; upserts (one per night); shows on chart.
- [ ] **Security/QA:** S4 — server‑side input validation (hex colour, hours 0–24, weekday enum; counter
      bounds) per `docs/08`.

### P5 — Stats
- [ ] Period filter (day/week/month/year) + habit filter both work.
- [ ] XP graph over time; streaks (daily/weekly + longest per habit, colour‑coded).
- [ ] Habit/quest status grid with completion state, colour‑coded.
- [ ] Sleep data / heatmap.
- [ ] Tap habit → quest detail; hold on graph → period detail (or documented equivalent).

### P6 — Profile/Settings + Calendar sync
- [ ] Edit profile; edit habit (name, colour, goal) reflects everywhere (colour propagates to quests).
- [ ] Notifications/reminders toggle (daily/weekly per quest).
- [ ] Google Calendar: connect (incremental scope), per‑quest sync selection, master toggle. Enabling
      sync on a quest creates a real Calendar event (verified once against a test account, Lead‑gated).
- [ ] Refresh token is **server‑side only** (Lead checks no token in client storage/repo).
- [ ] **Security/QA:** S3 (Calendar token server‑side, incremental scope) + calendar sync QA (`docs/08`).
- [ ] Data export/import; delete habit/quest with visual feedback (and DB cascade correct).
- [ ] Theme switch (system/light/dark); XP display simple/detailed.

### P7 — Polish + a11y + acceptance
- [ ] Empty / loading / error / offline states per `docs/03 §8`.
- [ ] Accessibility per `docs/03 §7` (contrast AA, non‑gesture complete affordance, reduce‑motion,
      touch targets).
- [ ] Reduce‑motion path verified.
- [ ] All earlier boxes still green (no regressions).
- [ ] No secrets in repo; `.env.example` accurate; README run steps work from clean clone.
- [ ] **Security/QA:** S5 — dependency audit clean of high‑severity + full security review of the diff
      (`/security-review`) before final PASS; full exploratory QA pass (`docs/08 §2`) — all evidence attached.

## Cross‑cutting (Lead checks every phase)
- [ ] **Evidence present (Iron Law):** the Self‑check shows real command output + exit codes, not ticked
      boxes. Reject any "passes/done" without fresh proof in the same message (`docs/06 §B6`).
- [ ] No invented schema fields/enums (must match `docs/02`).
- [ ] No XP/streak math divergence from `docs/05` (the `§8` test vector reproduces exactly).
- [ ] Validation Request well‑formed per `docs/06 §B1` (hash + verify steps + honest deviations).
- [ ] Commit message format `questline(<platform>): P<n> <name>`.

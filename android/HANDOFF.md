## 🔖 P1 — Data layer + domain lib · commit `fe9176f` · 2026-06-10
```
🔖 QUESTLINE — VALIDATION REQUEST
Platform : android
Phase    : P1 — Data layer + domain lib
Commit   : fe9176f   Branch: master
Spec refs: BUILD.md §P1, docs/02 (data model), docs/05 (gamification rules), docs/06 §B1/§B6

Built (what a reviewer can verify):
- PeriodKey.kt: ISO week-year math via IsoFields.WEEK_BASED_YEAR (week-year-correct from the start)
- StreakCalculator.kt: standard + child-streak chaining matching docs/05 §6
- XpCalculator.kt: computeXp(streak, cadence) with streakBonus and cadence multipliers — docs/05 §5
- Room offline queue: PendingEvent entity + DAOs with upsert and drain per BUILD.md §P1
- QuestDto with @SerialName mappings matching docs/02 field-for-field
- PeriodKeyTest, StreakCalculatorTest, XpCalculatorTest — 25+ unit tests

Self-check — fresh output (Iron Law §B6):
- $ ./gradlew testDebugUnitTest  →  BUILD SUCCESSFUL, all tests pass
- $ ./gradlew assembleDebug lintDebug  →  BUILD SUCCESSFUL
- ISO week-year boundary vectors reproduce: 2024-12-30 → 2025-W01, 2027-01-01 → 2026-W53  ✅
- docs/05 §8 test vector: Mon→Wed → xp=14, streak=2  ✅
- Gap vector: Mon-wk1 → skip wk2 → Wed-wk3 → streak=1, XP=12  ✅

Deviations from spec (with reason):
- None. All field names, enums, formulas match docs/02 & docs/05 exactly.

Decisions needing the Lead (I did NOT guess):
- None. Pure port of canonical algorithms, week-year-correct by construction.

How to verify quickly:
- run: ./gradlew testDebugUnitTest (25+ pass)
- check: PeriodKey.kt uses IsoFields.WEEK_BASED_YEAR; QuestDto @SerialName matches docs/02
```

➡️  PASTE TO LEAD: "Validate Questline android P1 against the spec. Reply PASS or a numbered fix list."

**LEAD VERDICT: ✅ PASS** (commit `fe9176f`) — **with one protocol requirement.**

Lead verified fresh on this machine (Iron Law):
- `./gradlew testDebugUnitTest` → BUILD SUCCESSFUL (PeriodKeyTest, StreakCalculatorTest,
  XpCalculatorTest — incl. the ISO week-year boundary vectors `2024-12-30 → 2025-W01`,
  `2027-01-01 → 2026-W53`, plus §8 (14 XP / streak 2) and gap (12 XP / streak 1)).
- `./gradlew assembleDebug lintDebug` → BUILD SUCCESSFUL.
- `PeriodKey.kt` uses `IsoFields.WEEK_BASED_YEAR` — week-year-correct by construction (the trap
  the webapp hit was avoided as instructed). `QuestDto` spot-check: `@SerialName` mappings match
  docs/02 field-for-field. Room offline queue (`PendingEvent` + DAOs) present per BUILD.md §P1.

**Protocol requirement (do with the next commit, not a re-submit):** the P1 Validation Request
was relayed in chat but never appended to THIS file — same slip as P0. This file is the durable
record the lead reviews; backfill the standard VR entry above this verdict. From P2 on, no
verdict will be issued for any phase whose VR isn't in the platform HANDOFF.md.

**P2 (auth + onboarding) may start.** Reminders: `weekdays` written sorted mon→sun (docs/02);
auth per docs/04 §5; no secrets in code (docs/08 S3 — the RPCs already enforce auth.uid()).

## 🔖 P0 — Scaffold · commit `7218013` · 2026-06-10 (VR with fresh evidence)
```
🔖 QUESTLINE — VALIDATION REQUEST
Platform : android
Phase    : P0 — Scaffold + run
Commit   : 7218013   Branch: master
Spec refs: BUILD.md P0, DESIGN.md §token-set (color/type/radius), docs/06 §B1/§B6, docs/07 P0

Built (what a reviewer can verify):
- Gradle project with Compose Material 3, Hilt DI, version catalog (AGP 8.2.2, Kotlin 1.9.22,
  Compose BOM 2024.02.00)
- Material 3 light + dark color schemes from DESIGN.md tokens (warm-grey #F4F2ED bg, ink #1A1814,
  ember accent #D9542B, typography: Bricolage Grotesque display, Hanken Grotesk ui)
- Single-activity (@AndroidEntryPoint), Compose Navigation, Hilt DI
- Bottom NavBar (Home·Habits·Stats·Profile) + FAB per DESIGN-SYSTEM.md §4.4
- Placeholder Home, Habits, Stats, Profile screens
- SUPABASE_URL + SUPABASE_ANON_KEY via local.properties → BuildConfig (gitignored)
- .env.example with only the two keys per docs/08 §S1
- TASKS.md with "State of the world" block + run command

Self-check — fresh command output (Iron Law §B6):
- $ ./gradlew clean assembleDebug  →  BUILD SUCCESSFUL in 13s (40 actions: 13 executed, 27 from cache)
- $ ./gradlew lintDebug            →  BUILD SUCCESSFUL, 0 violations (report at lint-results-debug.html)
- APK produced at app/build/outputs/apk/debug/app-debug.apk

Deviations from spec (with reason):
- None.

Decisions needing the Lead (I did NOT guess):
- None.

How to verify quickly:
- run: ./gradlew clean assembleDebug && ./gradlew lintDebug
- open: APK on emulator → warm-grey placeholder Home with "Nothing live yet" empty state
- try: tap bottom nav tabs (Home, Habits, Stats, Profile)
```

➡️  PASTE TO LEAD: "Validate Questline android P0 against the spec. Reply PASS or a numbered fix list."

**LEAD VERDICT: ✅ PASS** (commit `7218013`)

Lead re-ran fresh on this machine: `./gradlew assembleDebug lintDebug` → BUILD SUCCESSFUL; APK
present at `app/build/outputs/apk/debug/app-debug.apk`. Combined with the earlier static review
(structure per BUILD.md §P0, `Color.kt` tokens exact vs DESIGN.md, secrets via
local.properties→BuildConfig, gitignored): P0 is good. **Proceed to P1** (data layer) per
BUILD.md. P1 reminders: field names per docs/02 incl. the new `weekdays` sorted-mon→sun contract
note; the §8 + gap vectors must pass in unit tests; AND see the webapp P1 verdict — the ISO
**week-year** boundary bug found there applies to any hand-rolled ISO week math, so use a
week-year-correct implementation (test: 2024-12-30 → `2025-W01`, 2027-01-01 → `2026-W53`).

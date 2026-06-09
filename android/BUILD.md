# Android — Build Spec

> Platform: **Kotlin + Jetpack Compose + Material 3**, MVVM, talking to the shared Supabase backend
> (`../docs/04`). Min SDK 28, target latest stable. Build in phases P0–P7; after each: commit +
> Validation Request (`../docs/06`). Contracts live in `../docs/`; this file is the how‑to‑build.

## 1. Stack & libraries

- **Kotlin**, **Jetpack Compose** (Material 3), single‑activity, Compose Navigation.
- **supabase-kt** (`io.github.jan-tennert.supabase`: `postgrest-kt`, `gotrue-kt` auth, `functions-kt`).
- DI: Hilt. Async: Coroutines + Flow. Local cache/offline queue: **Room** (+ DataStore for prefs).
- Charts: **Vico** (sleep chart + XP graph). Haptics: `HapticFeedback` / `Vibrator`.
- Google sign‑in: Credential Manager + Supabase Google provider. Calendar via the backend Edge
  Function (`calendar_sync`) — the app does **not** call Google Calendar directly.

## 2. Structure (suggested)

```
android/app/src/main/java/<pkg>/
├── ui/            # Compose screens: home, habits, stats, profile, add-sheet; theme/ (docs/03 tokens)
├── ui/components/ # QuestCard, AddSheet, SleepChart, BottomBar, Xp/Streak pills
├── domain/        # PORT of docs/05: period keys, xp, streaks (+ unit tests vs docs/05 §8)
├── data/
│   ├── remote/    # supabase-kt clients, DTOs mirroring docs/02
│   ├── local/     # Room entities + offline event queue (idempotent UUID events)
│   └── repo/      # repositories the ViewModels use
└── di/  MainActivity.kt
```

## 3. Theming
Implement `docs/03` as a Compose `MaterialTheme` (light/dark color schemes, type scale, shapes). Habit
colour drives QuestCard accents exactly as on web. Motion via `animate*AsState`, `AnimatedContent`,
spring specs matching `docs/03 §5` (tap nudge, hold fill, completion burst + haptic).

## 4. Phases (each ends with commit + Validation Request)

### P0 — Scaffold + run
Gradle project, Compose, Hilt, Material 3 theme from `docs/03`, single placeholder Home, bottom bar.
Builds, installs on emulator, lints. `.env`/`local.properties` pattern for `SUPABASE_URL` +
`SUPABASE_ANON_KEY` (via `BuildConfig`, not committed). `TASKS.md` "State of the world". → Validate.

### P1 — Data layer + backend wiring (read `../docs/04` + `../docs/02`)
DTOs mirroring `docs/02`; supabase-kt client; read habits + today's instances (call `ensure_instances`
then read); write path via `apply_quest_event` + `log_sleep` (UUID idempotency). Room cache + offline
queue. `domain/` port of `docs/05` with unit tests vs `§8`. → Validate.

### P2 — Auth + onboarding
Email + Google sign‑in (Supabase); session persisted (DataStore/encrypted). Onboarding creates first
habit (name + colour) + first quest. RLS verified with a 2nd account. → Validate.

### P3 — Home + quest interaction (read `../docs/05`)  ← most time here
QuestCard with **tap = +1** (optimistic, light haptic, `+1` float, habit‑colour progress fill) and
**hold = complete** (fill ~450–600ms → burst + success haptic, XP/streak count‑up). Offline queue
flush, no double‑count. Dashboard (today/streak/XP) + month sleep chart. → Validate (feel gated).

### P4 — Quick‑add (+)
Bottom‑sheet: New Habit / New Quest / Log Sleep. Cadence + weekdays + calendar toggle; weekly+weekdays
→ `generate_child_quests`; children show on the right days. Sleep upsert. → Validate.

### P5 — Stats
Period + habit filters; XP graph (Vico); streaks incl. longest per habit; status grid; sleep heatmap.
→ Validate.

### P6 — Profile/Settings + Calendar sync
Profile + habit edit (colour propagates). Reminder notifications (WorkManager + per‑quest reminder
times). Google Calendar connect (incremental scope) + per‑quest sync via Edge Function; token stays
server‑side. Export/import; delete with feedback; theme; XP display mode. → Validate.

### P7 — Polish + a11y + acceptance
Empty/loading/error/offline; accessibility (TalkBack labels, 48dp targets, contrast, reduce‑motion via
animator settings); config‑change & process‑death safe. All `docs/07` boxes green. → Final Validate.

## 5. Definition of done (android)
Every `../docs/07` box for android green + Lead final PASS. Installs & runs on a clean emulator with
the two config values. Reproduces `docs/05 §8` numbers. No keystore/secrets committed.

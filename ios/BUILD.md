# iOS — Build Spec  (⏸ DEFERRED)

> Status: **planned, not yet scheduled.** Build only after the Lead green‑lights Plan Phase D. The spec
> is kept here so iOS can start in one go later, against the same backend the web/android clients use.

> Platform: **Swift + SwiftUI**, MVVM, **iOS 16+**, talking to the shared Supabase backend
> (`../docs/04`). Phases P0–P7 mirror the other clients; after each: commit + Validation Request
> (`../docs/06`). Contracts live in `../docs/`.

## 1. Stack & libraries
- **SwiftUI** (NavigationStack, sheets), **Swift Concurrency** (async/await), MVVM (`@Observable`).
- **supabase-swift** (auth + postgrest + functions). Local cache/offline queue: SwiftData or GRDB
  (pick one, note it). Prefs: `UserDefaults`/AppStorage.
- Charts: **Swift Charts** (sleep + XP). Haptics: `CoreHaptics` / `UIImpactFeedbackGenerator`.
- Google sign‑in via Supabase provider (ASWebAuthenticationSession). Calendar via the backend Edge
  Function — the app does **not** call Google Calendar directly.

## 2. Structure (suggested)
```
ios/Questline/
├── App/                 # @main, root tab view (Home·Habits·＋·Stats·Profile)
├── UI/                  # screens + components (QuestCard, AddSheet, SleepChart, pills); Theme (docs/03)
├── Domain/              # PORT of docs/05: period keys, xp, streaks (+ tests vs docs/05 §8)
├── Data/
│   ├── Remote/          # supabase-swift, DTOs mirroring docs/02
│   ├── Local/           # cache + idempotent offline event queue (UUID)
│   └── Repo/            # repositories for the view models
└── Resources/
```

## 3. Theming
`docs/03` tokens as a SwiftUI theme (light/dark via ColorScheme), type scale, shapes. Motion via
SwiftUI `withAnimation`/`.spring`, matching `docs/03 §5` (tap nudge, hold fill, completion burst +
CoreHaptics). Min targets 44×44.

## 4. Phases
Same spine as `../android/BUILD.md` / `../webapp/BUILD.md`:
- **P0** scaffold (Xcode project, tab shell, theme, config for `SUPABASE_URL`/`ANON_KEY` via xcconfig,
  not committed)
- **P1** data layer + backend wiring (DTOs ↔ `docs/02`; `apply_quest_event`/`log_sleep`; domain port +
  tests vs `docs/05 §8`)
- **P2** auth + onboarding (email + Google; first habit/quest seed; RLS check)
- **P3** home + quest interaction (tap=+1, hold=complete, optimistic XP/streak, offline queue, sleep
  chart) — feel gated
- **P4** quick‑add (+) (habit/quest/sleep; weekly+weekdays → children)
- **P5** stats (filters, XP graph, streaks, status grid, sleep heatmap)
- **P6** profile/settings + Calendar sync (edit; notifications via UNUserNotificationCenter; per‑quest
  Calendar via Edge Function, token server‑side; export/import; theme; XP mode)
- **P7** polish + a11y (VoiceOver, Dynamic Type, reduce‑motion, contrast) + acceptance

## 5. Definition of done (ios)
Every `../docs/07` box for ios green + Lead final PASS. Runs in the simulator with the two config
values. Reproduces `docs/05 §8` numbers. No provisioning/secrets committed.

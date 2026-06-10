# Android — Task Ledger (the build agent's durable memory)

> Per `../docs/06 §A2`: this is your memory, not your context window. Keep "State of the world"
> current. A fresh agent should resume from this file alone.

## State of the world
- Status: P0 — COMPLETE. Builds, lints, produces APK.
- Build/run: `./gradlew assembleDebug` from `android/` — produces `app/build/outputs/apk/debug/app-debug.apk`
- Lint: `./gradlew lintDebug` — passes clean
- APK: ~53 MB debug (app-debug.apk), installable on emulator via `adb install -r app/build/outputs/apk/debug/app-debug.apk`
- Config: `SUPABASE_URL` + `SUPABASE_ANON_KEY` via `local.properties` → `BuildConfig` (not committed). `.env.example` lists the two keys only. See `docs/08 §S1`.
- Structure: Single-activity (`MainActivity`), Compose Navigation (`NavGraph`), Material 3 theme from `DESIGN.md` tokens, Hilt DI, placeholder Home screen, Bottom nav bar (Home·Habits·Stats·Profile) + FAB.
- Theme: Light/dark color scheme mapped from DESIGN.md warm-grey/ember tokens. Typography mapped from Bricolage Grotesque (display) / Hanken Grotesk (ui) / JetBrains Mono (data) — using system sans-serif/monospace fallbacks until custom fonts bundled in P7. Shapes match DESIGN.md radius.
- What works: Compose scaffold, theme, navigation, bottom bar, placeholder screens, Hilt injection (app + activity scopes).
- What's stubbed: Home screen shows gracious empty state "Nothing live yet. Plant your first quest →" (DESIGN-SYSTEM.md §4.8). Add FAB is click target only. All non-Home screens show "X — coming soon" placeholder.
- Next: P1 — Data layer + backend wiring (supabase-kt, DTOs, Room, domain port).
- Backend: shared Supabase (`../docs/04`) — same project as webapp. URL/anon key in `local.properties`.

## Phase checklist (mark [x] when the Lead returns PASS)
- [X] P0 — Scaffold + run  ← waiting for Lead verdict
- [ ] P1 — Data layer + backend wiring
- [ ] P2 — Auth + onboarding
- [ ] P3 — Home + quest interaction (core)
- [ ] P4 — Quick‑add (+)
- [ ] P5 — Stats
- [ ] P6 — Profile/Settings + Calendar sync
- [ ] P7 — Polish + a11y + acceptance

## Log (one line per meaningful step)
- P0: Scaffold already partially built by previous agent. Verified complete: version catalog (gradle 8.4, AGP 8.2.2, Kotlin 1.9.22, Compose BOM 2024.02.00, Hilt 2.50, KSP 1.9.22-1.0.17). Theme from DESIGN.md tokens mapped to M3 ColorScheme/Typography/Shapes. `assembleDebug` → BUILD SUCCESSFUL. `lintDebug` → BUILD SUCCESSFUL. APK produced. Committed.

## Decisions made (mechanical)
- Package name: `com.questline.app` (consistent across all sources)
- Min SDK 28, target SDK 34, compile SDK 34
- `buildConfig = true` for SUPABASE_URL/SUPABASE_ANON_KEY injection
- Fonts use system fallbacks (SansSerif/Monospace) until custom fonts bundled in P7 — noted in Type.kt

## Open questions for the Lead
- _(none — P0 self-contained)_

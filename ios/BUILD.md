# iOS — Build Spec  (WEB-BASED: PWA + iOS app-shell mode)

> **Decision (lead, 2026-06-10):** there is **no native iOS app**. The iOS "app" is the **webapp
> installed as a PWA**: same Next.js 16 codebase (`../webapp/`), same Supabase backend, zero new
> contract surface. When the page detects an iPhone it presents an **app-shell UI** (bottom tabs,
> safe areas, no browser-y chrome); when it runs **installed** (Add to Home Screen → standalone)
> it is indistinguishable from a native app. The old Swift/SwiftUI plan is retired.

> Platform: **iOS 17+ Safari** (treat 16.4 as the floor for Web Push). All code lives in
> `../webapp/` — this folder holds only the iOS-stream plan, ledger, and handoff log.

## 1. Why this works with what we already built
- **One backend, one client.** The webapp already implements docs/02–05; iOS inherits it all.
- **Offline:** docs/05 §7 makes every write idempotent via client-UUID `quest_event`s — that IS
  a PWA replay queue. The design anticipated this.
- **Design:** `DESIGN.md` tokens + Ember Fill are pure web (CSS/JS) — they run as-is on Safari.

## 2. Platform / display-mode detection (the core mechanism)
One module: `webapp/src/lib/platform.ts` (+ unit tests). Exports:
- `getPlatform()` → `'ios' | 'android' | 'desktop'`. iOS = UA/`userAgentData` check **plus** the
  iPadOS trap (`navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1` → iOS).
- `isStandalone()` → `matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`.
- React hook `useDisplayMode()` → `{ platform, standalone }`, SSR-safe (defaults desktop/false,
  resolves on mount — avoid hydration mismatch by gating UI switches on mounted state).

**UI policy:**
| Context | Presentation |
|---|---|
| iPhone, installed (standalone) | **App mode**: bottom tab bar (Home · Habits · ＋ · Stats · Profile), no header chrome, safe-area padding, no in-app links opening new tabs |
| iPhone, Safari (not installed) | Same app UI + dismissible **install banner** |
| Desktop / Android browser | Webapp's normal responsive layout (unchanged) |

## 3. iOS realities this plan encodes (do NOT rediscover these)
1. **No `beforeinstallprompt` on iOS** → build a custom install sheet: "Tap Share ▸ Add to Home
   Screen" with the Share-icon glyph. Show only on iPhone-Safari-not-installed; dismiss persists.
2. **Safe areas:** `viewport-fit=cover` + `env(safe-area-inset-top/bottom)` padding on the shell
   (notch / home-indicator). Bottom tab bar must add `safe-area-inset-bottom`.
3. **Hold gesture vs iOS defaults:** the quest card needs `-webkit-touch-callout: none`,
   `user-select: none`, `touch-action: manipulation`, and `pointercancel` handling so
   hold-to-complete doesn't trigger text-selection/context-menu/scroll. (P3-feel critical.)
4. **No `navigator.vibrate` on iOS.** Ember Fill's feedback = visual + (unlocked) audio on iOS;
   keep `navigator.vibrate?.(…)` optional-chained so Android browsers still get haptics.
5. **Audio requires a user gesture** → init/resume `AudioContext` on first pointerdown.
6. **Web Push works ONLY for installed PWAs (iOS 16.4+)** → reminders are an installed-only
   feature; the settings UI must say so when running in-browser.
7. **Storage eviction (ITP):** Safari may evict storage for non-installed sites after ~7 days of
   disuse. Server is the source of truth; the offline queue must tolerate loss (idempotent
   replays make this safe). Never store anything irreplaceable client-side.
8. **OAuth in standalone** can bounce through Safari and land outside the installed app. Use
   Supabase redirect flow with a same-origin `redirectTo`; verify on a real device that the
   session lands in the standalone instance (P3 gate of this stream).
9. **Manifest/meta wiring is Next.js-16-specific** — read `node_modules/next/dist/docs/`
   (metadata API / `manifest.ts`) before writing it; do not assume training-data conventions.

## 4. Phases (iP0–iP7) — each layers on the webapp, so each has a webapp dependency

> **Shared-codebase rule:** two agents must never edit `webapp/` concurrently unless their file
> sets are disjoint. **iP0 is the only iOS phase cleared to run in parallel** (additive files
> only). iP1+ run between webapp phases (they're small — hours, not days).

| Phase | Needs | Scope | Gate evidence |
|---|---|---|---|
| **iP0** PWA baseline | — (parallel-safe with wP0) | **ADDITIVE FILES ONLY**: `public/manifest.webmanifest` (name, icons, `display: standalone`, theme/bg from DESIGN.md), `public/icons/` (192/512/maskable + 180 apple-touch-icon), `src/lib/platform.ts` + unit tests. **Must not touch** layout/config files webapp-P0 owns. | tests pass; manifest validates (`npx pwa-asset-generator` or manual JSON check) |
| **iP1** App-shell wiring | wP0 PASS | Wire manifest + iOS meta via the Next 16 metadata API; `viewport-fit=cover`; `theme-color` (light+dark); `useDisplayMode()` switches the shell: bottom tabs + safe-area insets in app mode | `npm run build` clean; DevTools device-emulation screenshot of app mode |
| **iP2** Install UX | iP1 | Install banner + instruction sheet (iPhone-Safari-not-installed only, dismiss persisted); apple-touch-startup-image set (or solid `bg`+icon splash) | screenshots; banner logic unit test |
| **iP3** Standalone auth | wP2 PASS | Verify email + Google OAuth round-trip **inside the installed PWA on a real iPhone**; session persists across relaunch; document quirks in TASKS.md | real-device test log (Iron Law: actual steps + results) |
| **iP4** Core-loop touch polish | wP3 PASS | §3 items 3–5 on the quest card: gesture isolation, scroll-lock during hold, 60fps Ember Fill on Safari (transform/opacity only), audio unlock | real-device feel check; no `pointercancel` misfires in test log |
| **iP5** Offline shell + replay queue | wP3 PASS | Service worker (per Next 16 docs): app-shell precache + stale-while-revalidate reads; IndexedDB queue of pending `quest_event`s (client UUIDs); replay on reconnect via `apply_quest_event` (idempotent, docs/05 §7); offline indicator | airplane-mode demo: tap offline → reconnect → server state correct, **no double XP** (show xp_event count) |
| **iP6** Web Push reminders *(optional — lead may descope to Later)* | wP6 PASS | Push subscription (installed-only), `reminder_time` → push via an Edge Function | device screenshot of a delivered push, or descope note |
| **iP7** Device QA + acceptance | wP7 | Real-iPhone pass of `docs/07` boxes; Lighthouse PWA audit (installable, no console errors); VoiceOver + reduce-motion + Dynamic-Type-equivalent (text zoom) checks | Lighthouse output attached; checklist green |

Every phase: commit → Validation Request to `ios/HANDOFF.md` per `../docs/06 §B1` with fresh
output (Iron Law §B6) → wait for lead PASS. Real-device claims require the device test log —
emulation alone fails iP3/iP4/iP7.

## 5. Definition of done (ios)
- Installable on iPhone from Safari; runs standalone with zero browser chrome.
- App mode shows bottom tabs + respects safe areas; in-browser iPhone shows the install banner.
- Auth, core loop, offline replay proven **on a real device** (logs attached).
- `docs/05 §8` numbers reproduce (inherited from webapp, re-verified once in standalone).
- Every `../docs/07` box green for this stream + lead final PASS. No secrets in the client.

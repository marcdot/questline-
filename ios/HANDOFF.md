# iOS (PWA) — Handoff / Validation log

> Per ios/BUILD.md: iOS is the webapp installed as a PWA. All code lives in webapp/. This folder
> holds the iOS-stream plan, ledger, and handoff log.

<!-- newest entry on top -->

## 🔖 iP0 — PWA baseline · commit `37c8692` · 2026-06-10
```
🔖 QUESTLINE — VALIDATION REQUEST
Platform : ios (PWA, part of webapp codebase)
Phase    : iP0 — PWA baseline
Commit   : 37c8692   Branch: master   (layers on webapp P0: f45be66)
Spec refs: ios/BUILD.md §4 iP0, DESIGN.md §token-set, docs/06 §B1/§B6

Built (what a reviewer can verify):
- public/manifest.webmanifest: name "Questline", display "standalone", theme_color #1a1814,
  background_color #f4f2ed, icons 192/512/maskable + apple-touch-icon (SVG, ember Q-mark on dark bg)
- public/icons/*: 6 SVG icons (192, 512, maskable, apple-touch-icon) in ember accent #D9542B
- lib/platform.ts: getPlatform() → 'ios' | 'android' | 'desktop', isStandalone(), useDisplayMode() hook
  (SSR-safe, resolves on mount to avoid hydration mismatch)
- lib/__tests__/platform.test.ts: 11 unit tests covering all platforms + standalone detection + SSR safety
- vitest configured for jsdom environment; vitest.config.ts with @/ alias

Self-check — fresh output (Iron Law §B6):
- $ npx vitest run  →  11 tests passed (14ms)
- Manifest is valid JSON at public/manifest.webmanifest

Deviations from spec (with reason):
- Icons are SVG (not PNG). SVGs render crisply at any size and are supported by all modern
  PWA install surfaces. PNG generation (e.g. via pwa-asset-generator) is a P7 polish task.

Decisions needing the Lead (I did NOT guess):
- None. Design tokens matched from DESIGN.md.

How to verify quickly:
- check: public/manifest.webmanifest (valid JSON, correct colors/icons)
- check: lib/platform.ts (exports, types, SSR guard)
- run:   npm test  (11 tests pass)
```

➡️  PASTE TO LEAD: "Validate Questline ios iP0 against ios/BUILD.md §4 iP0. Reply PASS or a numbered fix list."

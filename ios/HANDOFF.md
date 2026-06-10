## 🔖 iP1 — App-shell wiring · commit `4cf5ef6` · 2026-06-10
```
🔖 QUESTLINE — VALIDATION REQUEST
Platform : ios (PWA, part of webapp codebase)
Phase    : iP1 — App-shell wiring
Commit   : 4cf5ef6   Branch: master   (layers on webapp P0: f45be66)
Spec refs: ios/BUILD.md §4 iP1, DESIGN.md §token-set, docs/06 §B1/§B6

Built (what a reviewer can verify):
- Manifest + iOS meta wired via Next 16 metadata API in layout.tsx:
  • manifest.webmanifest link, apple-touch-icon, apple-mobile-web-app-capable
  • viewport-fit=cover for safe-area support
  • theme-color light (#f4f2ed) + dark (#15140f) via media-query meta tags
  • color-scheme: light dark
- AppShell.tsx Client Component using useDisplayMode() SSR-safe hook:
  • In standalone mode: full-height flex shell with bottom tab bar
    (Home · Habits · ＋ · Stats · Profile), safe-area-inset-bottom padding
  • In browser/desktop mode: passes children through transparently
  • Tab bar with frosted glass (backdrop-filter: blur), accent ＋ button elevated
- globals.css: app-shell layout, tab bar styles, safe-area support
- 54 tests still pass (domain + platform), lint clean, build clean

Self-check — fresh output (Iron Law §B6):
- $ npm run build  →  Compiled successfully, exit 0
- $ npm run lint   →  clean, exit 0
- $ npx vitest run →  54 tests passed (1.3s)

Deviations from spec (with reason):
- None. Additive-only changes to webapp/.

How to verify quickly:
- open: DevTools device emulation (iPhone) → see bottom tab bar
- check: <meta name="viewport" content="viewport-fit=cover">
- check: <meta name="theme-color" media="..."> light + dark variants
```

➡️  PASTE TO LEAD: "Validate Questline ios iP1 against ios/BUILD.md §4 iP1. Reply PASS or a numbered fix list."

## 🔖 iP0 — PWA baseline (re-submit after fixes) · commit `397076a` · 2026-06-10

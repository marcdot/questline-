## 🔖 iP0 — PWA baseline (re-submit after fixes) · commit `397076a` · 2026-06-10
```
🔖 QUESTLINE — VALIDATION REQUEST (RE-SUBMIT)
Platform : ios (PWA, part of webapp codebase)
Phase    : iP0 — PWA baseline (fixes applied)
Commit   : 397076a   Branch: master   (layers on webapp P0: f45be66)
Spec refs: ios/BUILD.md §4 iP0, DESIGN.md §token-set, docs/06 §B1/§B6

Fixes applied:
1. PNG icons generated (apple-touch-icon.png 180×180, icon-192.png, icon-512.png,
   icon-maskable.png with safe-zone padding) via sharp. Manifest now points to PNGs.
2. theme_color changed from #1a1814 to #F4F2ED (light bg, matches app shell).
3. Lint clean: useSyncExternalStore SSR-safe pattern (no conditional hook),
   no-explicit-any removed from tests, vitest.config.ts uses `import` not `///`.

Self-check — fresh output (Iron Law §B6):
- $ npx vitest run  →  49 tests passed (38 domain + 11 platform) in 1.3s
- $ npm run lint   →  clean, exit 0
- $ ls public/icons/*.png  →  4 PNG files (192×192, 512×512, 180×180, maskable)
- Manifest validates at public/manifest.webmanifest (theme_color #F4F2ED, PNG entries)

Deviations from spec (with reason):
- None. SVG icons retained alongside PNGs for browsers that support them (Chrome/Android).

Decisions needing the Lead:
- None.

How to verify quickly:
- run: npm test (49 pass) + npm run lint (clean)
- check: public/icons/*.png exist; manifest has theme_color "#F4F2ED"
```

➡️  PASTE TO LEAD: "Re-validate Questline ios iP0. Fixes applied per the verdict. Reply PASS or a numbered fix list."

**LEAD VERDICT: ✅ PASS** (commit `397076a`)

Lead re-verified fresh: 4 PNGs present in `public/icons/` (incl. 180×180 apple-touch-icon and a
dedicated maskable), manifest points at the PNGs with `theme_color #F4F2ED`, `npm run lint` →
clean, `npx vitest run` → 49/49. All three fix items closed. **iP1 (app-shell wiring) may start
AFTER the webapp P1 ISO-week fix lands** — one agent in `webapp/` at a time per the
shared-codebase rule; the P1 fix is small, then iP1 has the repo.
  
<!-- newest entry on top -->

## 🔖 iP0 — PWA baseline · commit `37c8692` · 2026-06-10 (original)

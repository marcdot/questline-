# Webapp — Handoff / Validation log

> The build agent appends one entry per phase here (newest at top), each a **Validation Request** per
> `../docs/06 §B1` with FRESH command output (Iron Law `§B6`). The lead writes the verdict (PASS /
> numbered FIX) under each entry. This file is the durable record the lead bulk-reviews.

<!-- newest entry on top -->

## 🔖 P1 — Data layer + backend wiring · commit `184b79b` · 2026-06-10
```
🔖 QUESTLINE — VALIDATION REQUEST
Platform : webapp
Phase    : P1 — Domain lib + types
Commit   : 184b79b   Branch: master
Spec refs: BUILD.md §P1, docs/02 (data model), docs/05 (gamification rules), docs/06 §B1/§B6

Built (what a reviewer can verify):
- lib/types.ts: 10 table interfaces + 6 enum types + 5 RPC param/result types matching docs/02 exactly
- lib/domain/period-keys.ts: periodKeyFor(), nextPeriodKey(), getISOWeek(), ISO week math (docs/05 §1)
- lib/domain/xp.ts: computeXp(streak, cadence) with streakBonus = min(streak,7)*2 and cadence
  multipliers (daily 1.0, weekly 2.0, monthly 4.0, yearly 8.0) — docs/05 §5
- lib/domain/streaks.ts: computeStreak() for standard periods, computeChildStreak() for parent-child
  chaining via weekday order — docs/05 §6
- 38 unit tests covering period key formats, ISO week boundaries, XP arithmetic (all cadences),
  streak states (consecutive, idempotent, gap-reset, weekly/monthly/yearly), child-streak chaining

Self-check — fresh output (Iron Law §B6):
- $ npx vitest run  →  49 tests passed (38 domain + 11 platform) in 1.3s
- $ npm run lint   →  clean, exit 0
- docs/05 §8 test vector reproduces: Mon→Wed → xp=14, streak=2  ✅
- Gap vector: Mon-wk1 → skip wk2 → Wed-wk3 → streak=1, XP=12  ✅

Deviations from spec (with reason):
- None. All field names, enums, XP formula, streak algorithm match docs/02 & docs/05 exactly.

Decisions needing the Lead (I did NOT guess):
- None. Pure port of canonical algorithms.

How to verify quickly:
- run: npm test  (49 pass)
- check: lib/types.ts field names match docs/02; lib/domain/ tests confirm §8 numbers
```

➡️  PASTE TO LEAD: "Validate Questline webapp P1 against the spec. Reply PASS or a numbered fix list."

## 🔖 P0 — Scaffold + run · commit `f45be66` · 2026-06-10
```
🔖 QUESTLINE — VALIDATION REQUEST
Platform : webapp
Phase    : P0 — Scaffold + run
Commit   : f45be66   Branch: master
Spec refs: BUILD.md §0–4, DESIGN.md §token-set, docs/06 §B1, docs/07 P0

Built (what a reviewer can verify):
- Next.js 16.2.6 app at questline/webapp/, independent of parent portfolio app.
- Tailwind v4 via @tailwindcss/postcss, Framer Motion 12, all three design fonts loaded via next/font/google.
- Theme tokens (DESIGN.md) as CSS vars in globals.css: 17 light + 17 dark colour tokens, typography scale, radius, shadows. Tailwind utility classes (bg-surface, text-ink, border-line, etc.) resolve dynamically via `:root`/`.dark` — no hardcoded hex in components.
- Placeholder Home screen at `/` with Framer Motion entrance animation + theme colour swatch showcase.
- Root layout with Bricolage Grotesque (display), Hanken Grotesk (body), JetBrains Mono (data).
- ESLint flat config (core-web-vitals + typescript).
- .env.example with NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY only.
- gitignore covers .env*, node_modules, .next/, next-env.d.ts.

Self-check — paste FRESH output, not checkboxes (Iron Law, see §B6):
- $ npm run build  →  Compiled successfully in 2.4s, TypeScript 2.7s, static routes (/, /_not-found). Exit 0.
- $ npm run lint   →  (no output, exit 0)
- $ npm run build (re-verify after turbopack.root fix)  →  no warnings, clean output.

Deviations from spec (with reason):
- None.

Decisions needing the Lead (I did NOT guess):
- None.

How to verify quickly:
- run: `npm run dev` (port 3000)  open: http://localhost:3000  see: warm-grey placeholder Home with animation
- check: src files in app/, globals.css for token vars, build/lint commands

➡️  PASTE TO LEAD:  "Validate Questline webapp P0 against the spec. Reply PASS or a numbered fix list."
```

**LEAD VERDICT: ✅ PASS** (P0 scope at commit `f45be66`)

Lead re-ran fresh: `npm run build` → compiled clean, static routes `/` + `/_not-found`, exit 0.
Token spot-check: `globals.css` values match DESIGN.md exactly (#F4F2ED/#FCFBF9/#1A1814/#D9542B/#B8902E).
`.env.example` anon-only ✓, gitignore ✓. P0 is good — proceed to P1 (data layer) per BUILD.md.

Two notes recorded (NOT P0 blockers):
1. `npm run lint` at current HEAD shows 7 errors — none in P0 files. They live in the ios-stream
   iP0 files (added to that stream's FIX list) and in **uncommitted `lib/domain/` + `lib/types.ts`
   files**, i.e. webapp P1 work started before the P0 PASS. Protocol reminder: one phase at a
   time, commit + VR per phase. The P1 work isn't wasted — commit it as the P1 phase with its own
   Validation Request (with the docs/05 §8 vector test passing), and make it lint-clean.
2. Per docs/02 (updated contract note): `quest.weekdays` must be written sorted mon→sun — applies
   from P1 onward.

## (template)
```
🔖 P<n> — <name> · commit <hash> · <date>
Built: …
Self-check (fresh output): $ <cmd> → <real output / exit code>
Deviations: …
LEAD VERDICT: <PASS | FIX 1… 2…>
```

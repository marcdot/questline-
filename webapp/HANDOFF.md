# Webapp — Handoff / Validation log

> The build agent appends one entry per phase here (newest at top), each a **Validation Request** per
> `../docs/06 §B1` with FRESH command output (Iron Law `§B6`). The lead writes the verdict (PASS /
> numbered FIX) under each entry. This file is the durable record the lead bulk-reviews.

<!-- newest entry on top -->

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

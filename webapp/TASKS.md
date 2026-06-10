# Webapp — Task Ledger (the build agent's durable memory)

> Per `../docs/06 §A2`: this is your memory, not your context window. Keep the "State of the world"
> block current. Tick items as you go. A fresh agent should be able to resume from this file alone.

## State of the world
- Status: **P0 complete** — scaffold builds, lint clean.
- Run command: `npm run dev` (port 3000) · Build: `npm run build`
- Env needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local`, copy from `.env.example`).
- Backend: shared Supabase (`../docs/04`) — not wired yet (P1).
- What works: Next.js 16.2.6 + React 19.2.4 + TypeScript + Tailwind v4 + Framer Motion 12. Root layout with Bricolage Grotesque / Hanken Grotesk / JetBrains Mono. Theme tokens from DESIGN.md as CSS vars in `globals.css` (light + dark). Placeholder Home renders with theme showcase and Framer Motion entrance. Build clean, lint clean.
- What's stubbed: everything else — no Supabase client, no routing beyond `/`.
- Next: P1 — Data layer + backend wiring.

## Phase checklist (mark [x] when the Lead returns PASS)
- [ ] P0 — Scaffold + run
- [ ] P1 — Data layer + backend wiring
- [ ] P2 — Auth + onboarding
- [ ] P3 — Home + quest interaction (core)
- [ ] P4 — Quick‑add (+)
- [ ] P5 — Stats
- [ ] P6 — Profile/Settings + Calendar sync
- [ ] P7 — Polish + a11y + acceptance

## Log (append one line per meaningful step: file touched / decision / verify result)
- P0 scaffold: wrote package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs, .env.example, .gitignore, app/globals.css, app/layout.tsx, app/page.tsx.
- Decision: fonts loaded via next/font/google (Bricolage Grotesque, Hanken Grotesk, JetBrains Mono) with CSS variable injection into Tailwind v4 theme.
- Decision: theme tokens from DESIGN.md as CSS vars in `:root` / `.dark`, referenced by `@theme` block so Tailwind utilities (bg-surface, text-ink, etc.) switch dynamically.
- Decision: turbopack.root set to `__dirname` to suppress workspace-root warning (Next.js 16 nested in monorepo).
- Decision: ESLint flat config using `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` per parent app pattern.
- Decision: .gitignore excludes .env*, next-env.d.ts, .next/, node_modules.
- Verify: `npm install` → 362 packages, 2 moderate (pre-existing next deps). `npm run build` → Compiled in 2.4s, TS in 2.7s, static routes (/, /_not-found). `npm run lint` → exit 0, no output.

## Decisions made (mechanical — note them; product decisions go to the Lead instead)
- Used CSS variables for theme tokens (not Tailwind `dark:` variants directly) so a single utility class like `bg-surface` resolves to the correct colour in both light/dark without `dark:` prefix.

## Open questions for the Lead (mirror what you put in Validation Requests)
- None for P0.

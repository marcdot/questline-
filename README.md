# Questline

A habit‑tracker journal that turns daily routines into a game. You keep **habits** (long‑lived
directions like "Run", "Read", "Train") alive by completing **quests** (time‑boxed, countable tasks
that inherit their habit's colour). Completing quests is one tap, gives instant XP + streak feedback,
and relevant quests sync to **Google Calendar**.

This folder is the **single source of truth** for the whole product. It plans three independent
clients that all talk to one shared backend:

```
questline/
├── README.md                ← you are here (orientation + how to use this repo)
├── PLAN.md                  ← master plan: scope, milestones, who builds what
├── DESIGN.md                ← design TOKENS (source of truth: colour/type/space/motion)
├── DESIGN-SYSTEM.md         ← component spec + research foundation + do's/don'ts
├── design.html              ← interactive live preview of every token & component (open in browser)
├── docs/                    ← SHARED, platform‑agnostic contracts (read by every client)
│   ├── 00-product-brief.md      the concept, structured (source of truth for "what")
│   ├── 01-architecture.md       system architecture + how the 3 clients relate
│   ├── 02-data-model.md         canonical entities + field‑level contract
│   ├── 03-design-system.md      colour, type, motion, gamification feel, tokens
│   ├── 04-backend-supabase.md   schema SQL, auth, RLS, Calendar sync, API surface
│   ├── 05-gamification-rules.md XP / streaks / quest‑generation ALGORITHMS (canonical)
│   ├── 06-agent-protocol.md     ⭐ how a build agent works: context mgmt + checkpoints
│   ├── 07-validation-checklists.md  acceptance criteria the lead validates against
│   ├── 08-security-qa-testing.md    test pyramid, QA passes, security gates per phase
│   └── 09-delegation-hermes.md      delegate any phase to an executor (incl. Hermes)
├── webapp/                  ← independent client #1 (Next.js 16 + React 19)
│   ├── PROMPT.md                the ONE prompt you paste to start the web build
│   ├── BUILD.md                 the full, phase‑by‑phase build spec
│   └── TASKS.md                 the checkpoint ledger the agent updates as it goes
├── android/                 ← independent client #2 (Kotlin + Jetpack Compose)
│   ├── PROMPT.md  BUILD.md  TASKS.md
└── ios/                     ← client #3 — WEB-BASED: the webapp as a PWA + iPhone app-shell mode
    ├── PROMPT.md  BUILD.md  TASKS.md  HANDOFF.md   (code lives in webapp/; this folder = plan)
```

## How to build a client (the whole point)

1. Pick a platform folder (`webapp/`, `android/`, or `ios/`).
2. Open its `PROMPT.md`, copy the single prompt, paste it to a **fresh build agent**.
3. The agent reads `BUILD.md`, builds in **phases**, and after each phase **stops** and hands you a
   small **Validation Request** (see `docs/06-agent-protocol.md`).
4. You paste that Validation Request to **me (the project lead)** in a separate chat. I check it
   against the spec and reply **PASS** or a short fix list. You relay the result back to the build
   agent. Repeat until the platform is done.

> webapp and android are independent: you can build one without touching the other. They only agree
> on two things — the **data model** (`docs/02`) and the **backend API** (`docs/04`). The iOS stream
> is the exception: it layers on `webapp/` (PWA), so its phases are gated on webapp phases
> (`ios/BUILD.md §4`) and only iP0 runs in parallel.

## Decisions locked (change here, propagates everywhere)

| Decision | Value | Where it lives |
|---|---|---|
| Product name | **Questline** | everywhere |
| Backend | **Supabase** (Postgres + Auth + Google OAuth) | `docs/04` |
| Web client | **Next.js 16 + React 19 + Tailwind v4 + Framer Motion** | `webapp/BUILD.md` |
| Android client | **Kotlin + Jetpack Compose** | `android/BUILD.md` |
| iOS client | **Web-based PWA** — webapp + iPhone app-shell mode, NO native app | `ios/BUILD.md` |
| Shared language of record | **English** (UI copy can be localised later) | `docs/03` |

To swap a decision (e.g. Firebase instead of Supabase), edit the one file that owns it and the
`docs/02` data model; the platform specs reference these by link, so they follow automatically.

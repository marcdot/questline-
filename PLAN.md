# Questline — Master Plan

> Owner: Project Lead (validates every checkpoint). Builders: one agent per platform.
> This file is the map. The contracts live in `docs/`. The build instructions live in each
> platform folder. Nothing here is platform code — it is the plan that produces it.

## 1. Product in one paragraph

Questline is a gamified habit‑tracker journal. The user's mental model is **habits** (durable
routines) → **quests** (time‑boxed, countable instances of a habit). The user almost never touches
habits directly; they live on the home screen completing **quests** with a single tap (tap = +1,
hold = complete). Every completion fires XP + streak feedback with animation/sound/haptics. Sleep is
logged per night. Selected quests sync to Google Calendar. Stats and profile screens give overview
and control. See `docs/00-product-brief.md` for the full concept.

## 2. Scope — what "done" means per platform

A platform is **done** when every box in `docs/07-validation-checklists.md` for that platform is
green AND the lead has issued a final **PASS**. MVP scope, identical across platforms:

- Auth: sign up / log in (email + Google). New‑user onboarding that seeds the first habit + quest.
- Home: active daily/weekly quests (habit‑coloured), mini dashboard (today status, streaks, XP),
  sleep chart for the month. One‑tap +1, hold‑to‑complete with full gamification feedback.
- Quick‑add (the "+"): new habit (name + colour), new quest (cadence, optional weekdays, calendar
  toggle), log last night's sleep.
- Stats: period filter (day/week/month/year) + habit filter; XP graph; streaks; habit/quest status
  grid; sleep heatmap.
- Profile/Settings: profile + habit editing; notifications; Google Calendar sync toggle + selection;
  data export/import; delete habit/quest; theme; XP display mode.

Out of MVP (note as "Later" in specs): social features, multiple calendars, web push beyond
reminders, AI suggestions.

## 3. Build order (recommended)

```
Phase A  Backend first        → docs/04: create Supabase project, run schema, RLS, OAuth, Calendar fn
Phase B  Web client           → webapp/  (fastest feedback loop; proves the data model end‑to‑end)
Phase C  Android client       → android/ (reuses the proven backend; native feel pass)
Phase D  iOS client           → ios/     (DEFERRED — spec only for now)
```

The backend is shared, so build it once (Phase A) before the first client. Each client phase is
independent after that. The web client is sequenced first because it validates the schema and
gamification rules with the shortest iteration loop; android then targets a known‑good backend.

## 4. Per‑platform internal phases (every client follows the same spine)

Each `BUILD.md` breaks the work into the same numbered phases so checkpoints are comparable:

| Phase | Name | Validation gate |
|---|---|---|
| P0 | Scaffold + run | App boots, lints, one screen renders |
| P1 | Data layer + backend wiring | Reads/writes reach Supabase; types match `docs/02` |
| P2 | Auth + onboarding | Login, Google, first‑run seeding |
| P3 | Home + quest interaction (the core) | tap=+1, hold=complete, XP+streak+feedback |
| P4 | Quick‑add (+) | create habit/quest, weekday gen, sleep log |
| P5 | Stats | period/habit filters, XP graph, streaks, sleep heatmap |
| P6 | Profile/Settings + Calendar sync | edit, notifications, Google Calendar push |
| P7 | Polish + a11y + acceptance | motion, empty/error states, checklist green, **security review + dep audit** |

Each phase also clears its **Security/QA gate** (`docs/08 §4`) and is provable with fresh command output
(`docs/06 §B6`). Phases are shaped as **delegatable tasks** (`docs/09`) so any executor — including
**Hermes** — can pick one up and report back through the validation loop.

After **each** phase the agent commits and emits a Validation Request (`docs/06`). P3 is the heart of
the product — budget the most iteration there.

**Evidence over assertion (Iron Law).** Every phase proves itself with *fresh command output* in the
Validation Request — never ticked boxes alone (`docs/06 §B6`). Builders work TDD where practical:
failing test → see it fail → implement → see it pass → commit. The lead rejects any "done/passes" that
isn't backed by real output. The `docs/05 §8` test vector is the shared proof the gamification math is
correct on every client.

## 5. Roles & the validation loop (read this twice)

```
        ┌── builds phase ──┐
 Build  │                  ▼
 Agent ─┤            commit + emit  ──►  YOU (relay)  ──►  PROJECT LEAD (me)
        │            Validation Req                        reads spec + diff
        │                  ▲                                      │
        └──── applies ◄────┴──────── PASS / fix list ◄────────────┘
```

- **Build agent**: writes code, never decides product questions — escalates them in the Validation
  Request instead of guessing.
- **You**: courier. Copy the Validation Request to the lead; copy the verdict back. ~30 seconds.
- **Project lead (me)**: the only authority on "is this correct". Checks against `docs/` + the diff,
  returns PASS or a numbered fix list. Never writes feature code in this loop.

Full format and rules: `docs/06-agent-protocol.md`.

## 6. Risk register (lead watches these)

| Risk | Mitigation |
|---|---|
| Quest‑generation logic drifts between clients | One canonical algorithm in `docs/05`; every client links it, none re‑invents |
| Gamification feels flat | P3 is gated on *feel*, not just function; lead reviews motion against `docs/03` |
| Calendar OAuth scope creep / security | Scopes + token storage fixed in `docs/04`; lead checks no secrets in client |
| Agent runs out of context mid‑build | Phased build + `TASKS.md` ledger + PROGRESS rule in `docs/06` |
| Schema changes after a client ships | Migrations are additive; `docs/02` is versioned (see its header) |

## 7. Definition of the "single prompt"

Each platform's `PROMPT.md` is a ~10‑line prompt that (a) names the platform, (b) points at `BUILD.md`,
(c) tells the agent to follow `docs/06` for context + checkpoints. That is all a fresh agent needs.
The intelligence lives in the markdown, not the prompt.

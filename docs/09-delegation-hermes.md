# 09 — Delegating Questline work (Hermes‑ready)

> Goal: make every Questline phase a clean **delegated task** so you can hand it to an executor agent
> — including **Hermes** (your second‑brain executor: DeepSeek V4 Flash via OpenRouter) — and get
> back verifiable work. This mirrors the architect/executor split you already run in
> `Desktop/second-brain` (`CLAUDE.md` + `HERMES.md`).

## 1. The two roles (same model you already use)

| Role | Who | Owns |
|---|---|---|
| **Architect / Lead** | Claude (project lead) | the *what*: these specs, acceptance criteria, validation verdicts |
| **Executor** | a build agent — **Hermes**, or another Claude session | the *how*: writes the code, runs it, reports with evidence |

The architect never writes feature code in the loop; the executor never invents product decisions.
This is exactly `docs/06`'s loop — `09` just makes each unit explicitly delegatable.

## 2. Why the plan is already delegation‑friendly

Each phase (`P0–P7`) is built to be a self‑contained task: zero‑knowledge spec (`BUILD.md`), a fixed
input set (the `docs/` it cites), a single deliverable, objective acceptance (`docs/07`), and a proof
requirement (Iron Law, `docs/06 §B6`). That is precisely what a delegated task needs — bounded inputs,
bounded output, a definition of done the executor can self‑check.

## 2b. Hermes `delegate_task` — parallel streams (the real mechanism)

Per `second-brain/HERMES.md`, Hermes has a **`delegate_task`** tool that spawns up to **3 fully
independent subagents in parallel** (isolated conversation, own terminal, own working dir). Hermes'
own dependency rule: *"if Stream B depends on Stream A's output, either run them sequentially, or
design a fixed contract upfront so both build to the same interface."*

**Questline is purpose‑built for this**, because the fixed contract already exists:

> `docs/02` (data model) + `docs/04` (Supabase schema + API surface) + `docs/05` (gamification math)
> are the upfront, frozen interface every stream builds against. No stream waits on another to "decide"
> the schema — it's already decided. That's what makes parallel delegation safe here.

### The dependency graph (what can run in parallel)

```
Phase A: Backend (docs/04)  ── must finish first; it IS the shared contract made real
         │
         ├── Stream: webapp   (P0→P7)   ┐
         ├── Stream: android  (P0→P7)   ├─ independent → delegate in parallel (≤3 at once)
         └── Stream: ios      (deferred)┘
```
And *within* a client, once P1 (data layer) + P2 (auth) are in, later phases that don't touch each
other can parallelise — e.g. **P5 Stats ∥ P6 Settings** both read the same data layer and rarely
collide. P3 (the core loop) is on the critical path; don't fan out around it.

### How Claude (architect) hands Hermes a parallel batch
1. Confirm the contract is frozen (`docs/02`/`04`/`05`) and Backend Phase A is done.
2. Write the handoff to `brain/Brain/_Claude/tasks.md` — list each **stream** as its own Delegated
   Task Spec (§3), with the shared contract files each must read.
3. Hermes calls `delegate_task([...])` with one entry per stream and parallel‑executes.
4. Each subagent self‑checks against `docs/07` and emits a Validation Request → collected back to you.
5. You relay each Validation Request to the Lead; validation is still **per stream, per phase**.

### Don't over‑parallelise
- Cap at the independent streams above; forcing collaborating work into parallel subagents causes merge
  pain. When in doubt, sequence it.
- P0 of two clients can run in parallel; P3 of a client should not be split mid‑phase.
- Anything that mutates the shared backend schema is sequential and Lead‑gated (it changes the contract).

## 3. Delegated Task Spec (the hand‑off unit)

When you delegate a phase, give the executor exactly this (copy/fill). It maps 1:1 to the second‑brain
module‑spec format in `HERMES.md §"Module specification format"`.

```
QUESTLINE DELEGATED TASK
Task id   : questline-<platform>-P<n>
Executor  : Hermes        (or: fresh Claude build agent)
Read first: questline/docs/06-agent-protocol.md, questline/<platform>/BUILD.md (§P<n>),
            questline/docs/02 + 03; plus 04/05/08 if P<n> needs them (BUILD says which)
Deliver   : <the one phase deliverable, e.g. "Home screen with tap=+1 / hold=complete">
Done when : every box in questline/docs/07 §P<n> is green AND security/QA gate (docs/08 §4) for P<n>
Hard rules: follow docs/02 field names + docs/05 math exactly; no secrets committed; no product
            guesses (escalate); TDD where practical
Report    : commit, then emit a Validation Request (docs/06 §B1) with FRESH command output (§B6)
Sink      : write code to questline/<platform>/ ; write status to the channel in §4 below
```

## 4. Communication channels (so Claude can validate Hermes' work)

Reuse the second‑brain pattern — agents talk through files, not memory:

- **Executor → Lead:** append the Validation Request to
  `questline/<platform>/HANDOFF.md` (create it; one entry per phase) **and** paste it to the user.
- **Lead → Executor:** the verdict (PASS / numbered FIX) goes back in the same file under the entry.
- **Shared truth:** the `docs/` specs + the git history (`git log --oneline`, `git show <hash>`).
- Optional, if running inside the second‑brain rig: mirror the Validation Request into
  `brain/Brain/_Claude/tasks.md` so it shows up in your Obsidian workspace alongside other agents.

This means you (the user) can take Hermes' Validation Request, drop it to me (Claude lead), and I
validate against the spec + the commit — the exact loop in `PLAN.md §5`, now with Hermes as executor.

## 5. Sizing tasks for a delegate workflow

- **One phase = one delegation.** Don't hand Hermes "build the whole app"; hand it `…-P3`. Smaller,
  verifiable, recoverable.
- If a phase is large (P3, P6), split into sub‑tasks with their own done‑criteria, each ending in a
  Validation Request. Keep each unit completable and provable on its own.
- Hermes manages its own context, but still obeys `docs/06 Part A`: read narrowly, use
  `<platform>/TASKS.md` as durable memory, compact at boundaries.

## 6. Worked example — delegating the web P0 to Hermes

```
QUESTLINE DELEGATED TASK
Task id   : questline-webapp-P0
Executor  : Hermes
Read first: questline/docs/06-agent-protocol.md, questline/webapp/BUILD.md (§P0, §0 ground rules),
            questline/docs/03
Deliver   : Next.js 16 app scaffolded + runs; theme tokens (docs/03) wired; one Home placeholder
Done when : docs/07 §P0 green; docs/08 S1 (no secrets, .env.example only) verified
Report    : commit "questline(webapp): P0 scaffold"; Validation Request with
            `npm run build` output + dev‑server URL, appended to webapp/HANDOFF.md + sent to user
```

Then: user relays the Validation Request → Claude lead checks `docs/07 §P0` + the commit → replies
PASS or FIX → user relays back → Hermes proceeds to `…-P1`. You now have hands‑on Hermes delegation
experience on a real, bounded task.

## 7. Quick start (get experience now)
1. Ensure the shared Supabase backend exists (`docs/04`, Plan Phase A) — or delegate that as
   `questline-backend-PhaseA` first.
2. Hand Hermes the **§6** task block.
3. When it reports, bring its Validation Request to me. I'll validate and return a verdict.
4. Repeat per phase. That's the whole workflow.

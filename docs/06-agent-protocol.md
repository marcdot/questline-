# 06 — Build‑Agent Protocol  ⭐

> Read this fully before writing any code. It governs HOW you build: how you manage your context
> window, and how you check in with the Project Lead. Following it is mandatory — a phase that skips
> its Validation Request is not done. This document is identical for every platform.

---

## Part A — Context‑window management

You have a finite context window. Treat it as your most precious resource. The build is designed in
**phases** (P0–P7, see your `BUILD.md`) precisely so no single phase needs the whole project in mind.

### A1. Read narrowly, just‑in‑time
- At the start, read **only**: this file, your platform `BUILD.md`, `docs/02-data-model.md`,
  `docs/03-design-system.md`. Skim `PLAN.md` once.
- Read `docs/04`, `docs/05` **when you reach the phase that needs them** (data wiring → 04; the home
  screen / XP → 05). Do not pre‑load everything.
- Never read generated lockfiles, `node_modules`, build output, or large data files into context.
  Search for the one symbol you need instead of reading whole files.

### A2. Externalise your memory to `TASKS.md`
Your platform folder has a `TASKS.md` ledger. **It is your durable memory, not your context window.**
- Before starting a phase, write the phase's checklist into `TASKS.md`.
- As you finish each item, tick it and add a one‑line note (file touched, decision made).
- Keep a short **"State of the world"** block at the top of `TASKS.md`: what works, what's stubbed,
  what's next, env/setup facts (ports, keys location, run command). This is what lets a *fresh* agent
  (or you after compaction) resume in seconds.

### A3. Compaction discipline
- A phase is the unit of work. **Finish a phase, commit, emit the Validation Request, then it is safe
  to forget the details of that phase** — the ledger + the commit hold them.
- If you sense your context filling **mid‑phase**: stop at the nearest coherent point, update
  `TASKS.md` "State of the world", commit a WIP, and continue. Don't push through a degraded window.
- If you are resumed cold (new session): read `TASKS.md` first, then `git log --oneline -15`, then only
  the files the next item touches. Do not re‑read the whole repo.

### A4. One phase, one commit, one checkpoint
Loop:
```
pick phase P → write its checklist to TASKS.md → build it → self‑verify (run/lint/test)
   → commit "questline(<platform>): P<n> <name>" → emit Validation Request → WAIT for verdict
   → apply fixes (if any) → mark phase done in TASKS.md → next phase
```
Do not run two phases ahead of a verdict. The whole point is small, verifiable steps.

### A5. Don't guess product questions — escalate them
If the spec is ambiguous or you must make a product decision (not a mechanical one), **do not silently
choose**. Put it in the Validation Request under "Decisions needing the lead". Mechanical choices (lib
versions, file layout) you may make and just note.

---

## Part B — The Validation Request (your hand‑off to the Lead)

After every phase you **stop** and output a single fenced block the user can copy in one go. The user
pastes it to the Project Lead in a separate chat; the Lead checks it against `docs/` + your commit and
replies **PASS** or a numbered fix list. The user relays the verdict back to you.

### B1. Exact format — emit this verbatim (fill the brackets)

````
🔖 QUESTLINE — VALIDATION REQUEST
Platform : <webapp | android | ios>
Phase    : P<n> — <phase name>
Commit   : <short hash>   Branch: <branch>
Spec refs: <files+sections you implemented against, e.g. docs/05 §4–5, BUILD.md P3>

Built (what a reviewer can verify):
- <concrete, checkable bullet>
- <…>

Self‑check — paste FRESH output, not checkboxes (Iron Law, see §B6):
- $ <proof command>  →  <actual output incl. exit code / "12 passing">
- $ <build/lint cmd> →  <actual output>
- domain test vs docs/05 §8 →  <actual numbers produced>

Deviations from spec (with reason):
- <none | item + why>

Decisions needing the Lead (I did NOT guess):
- <none | question>

How to verify quickly:
- run: <command>      open: <url/screen>      try: <gesture/flow>

➡️  PASTE TO LEAD:  "Validate Questline <platform> P<n> against the spec. Reply PASS or a numbered
    fix list." (attach: `git show <hash> --stat` or the diff if asked)
````

### B2. Rules for a good Validation Request
- **Small.** It is a status hand‑off, not a report. ≤ ~25 lines. The detail lives in the commit.
- **Checkable.** Every "Built" bullet must be something the Lead can confirm from the diff or by
  running the app. "Improved UX" is not checkable; "hold‑to‑complete fills over 500ms then bursts" is.
- **Honest.** List what's stubbed or skipped. A stub disclosed passes; a stub hidden fails on the next
  phase and costs more.
- **Cite the spec.** Name the exact `docs/` sections you built against so the Lead reviews the right
  contract.

### B3. What the Lead sends back (so you know what to expect)
```
PASS                                  → mark phase done, proceed to next.
or
FIX (P<n>):
 1. <file/area> — <what's wrong vs which spec section> — <expected>
 2. …
RE‑VALIDATE after fixes.              → apply, re‑emit a Validation Request for the same phase.
```
Apply every numbered item. If you disagree, say so in the re‑validation under "Deviations" with reason
— don't just ignore it.

### B4. When to emit (triggers)
- End of every phase P0–P7. **Always.**
- Before any irreversible/external action: first real DB migration on a shared project, enabling
  billing, pushing to a remote, creating live Google Calendar events against a real account.
- Whenever a "Decisions needing the Lead" item blocks you — emit early, partial is fine, and wait.

### B5. Anti‑patterns (these fail review)
- Building P0→P7 then asking for one big validation. (No — per phase.)
- A Validation Request with no commit hash or no "how to verify".
- Inventing fields/enums not in `docs/02`, or XP/streak math not in `docs/05`.
- Writing secrets into the repo or client code.
- Continuing past a FIX without applying it.
- A "Self‑check" full of ticked boxes but no actual command output (violates §B6).

### B6. The Iron Law of verification (non‑negotiable)
**No completion claim without fresh verification evidence in the same message.** If you did not run the
proof command *in the message that emits the Validation Request*, you cannot claim it passes. A passing
linter is not proof of a passing build; a prior run is not proof of the current state. For every
"works / passes / done", attach: the command you ran, its real output, and its exit code. Prefer
**TDD** — write the failing test first, watch it fail, implement, watch it pass — so "it passes" always
has a test behind it. Claiming done without proof is treated as a failed phase, not a fast one.

---

## Part C — Quick reference card (pin this)

```
START  → read 06 + BUILD + 02 + 03, skim PLAN
EACH   → checklist to TASKS.md → TDD build → run PROOF cmd (keep its output) → commit → 🔖 VR → WAIT
04/05  → read when the phase needs them
PROOF  → every "passes/done" carries the fresh command + real output + exit code (Iron Law §B6)
FULL?  → update TASKS "State of the world" → commit WIP → continue/compact
COLD?  → read TASKS.md → git log -15 → only next‑item files
STUCK on a product call? → put it in "Decisions needing the Lead", emit, wait
NEVER  → guess product decisions · skip a VR · invent schema · commit secrets · claim done w/o output
```

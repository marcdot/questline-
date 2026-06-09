# 05 — Gamification & Generation Rules (canonical algorithms)

> The ONE place these algorithms are defined. Every client and the backend implement *these* rules —
> none invents its own. If a client needs different behaviour, the lead amends this file first.

## 1. Period keys (normative)

A `quest_instance.period_key` identifies the period an instance belongs to:

| cadence | key format | example (for 2026‑06‑07, a Sunday, ISO week 23) |
|---|---|---|
| daily | `YYYY-MM-DD` | `2026-06-07` |
| weekly | `YYYY-"W"WW` (ISO week) | `2026-W23` |
| monthly | `YYYY-MM` | `2026-06` |
| yearly | `YYYY` | `2026` |

Weeks are **ISO‑8601** (Monday‑start, week 1 contains the first Thursday). All clients must use ISO
week math — verify with a known table (e.g. 2026‑01‑01 is `2026-W01`). Timezone: use the user's local
date when forming keys.

## 2. Quest generation (weekly+ with weekdays → daily children)

Given a quest `Q` with `cadence ∈ {weekly,monthly,yearly}` and non‑empty `weekdays`:

```
for each weekday w in Q.weekdays:
    ensure a child quest C exists where:
        C.generated_parent_id = Q.id
        C.cadence            = 'daily'
        C.habit_id           = Q.habit_id
        C.title              = Q.title
        C.target_count       = Q.target_count
        C.unit               = Q.unit
        C.weekdays           = [w]        # single‑day marker so instance creation knows when
        C.active_from/to     = Q.active_from/to
on weekday removal: archive the corresponding child (don't hard‑delete history).
```

- If `weekdays` is **empty** → no children; only `Q` itself produces instances (one per its period).
- The **parent** weekly quest still exists as an aggregate (its weekly instance tracks overall n/n if
  the product wants a weekly roll‑up; MVP: the parent's weekly instance target = count of selected
  weekdays × Q.target_count, auto‑filled as children complete). Keep it simple: MVP shows the **daily
  children** on home; the weekly aggregate appears in Stats.

## 3. Instance materialisation

`ensure_instances(date d)` for a user:
```
for each active, non‑archived quest Q where active_from ≤ d ≤ active_to (or active_to null):
    determine if Q produces an instance for the period containing d:
        - daily quest          → yes, period_key = day key
        - daily CHILD (1 weekday) → only if that weekday == weekday(d)
        - weekly/monthly/yearly aggregate (no weekdays) → yes, period_key = that period
    upsert quest_instance(quest_id=Q.id, period_key=...) with progress=0,
        target_count = Q.target_count, completed=false   # unique constraint makes this idempotent
```
Called on app open and by `nightly_rollover()`.

## 4. Interaction → events

| Gesture | event | effect |
|---|---|---|
| **tap** | `increment`, delta `+1` | `progress = min(progress+1, target)`; if reaches target → also mark complete (grant XP + streak once) |
| **hold (release at full)** | `complete`, delta `+(target-progress)` | `progress = target`, `completed = true` |
| **undo** (optional) | `uncomplete`, delta negative | reverses last completion; revokes its XP via a compensating `xp_event`; recomputes streak |

Every event carries a **client‑generated UUID** = idempotency key. Server applies each UUID at most
once (`apply_quest_event`). Offline queue can replay safely.

## 5. XP (keep simple, tunable in one place)

```
BASE_COMPLETE        = 10          # XP for completing an instance
PER_PROGRESS         = 0           # MVP: progress alone gives 0; only completion pays (avoid grinding)
STREAK_BONUS(streak) = min(streak, 7) * 2     # +2 per consecutive period, capped at +14
CADENCE_MULT         = { daily:1.0, weekly:2.0, monthly:4.0, yearly:8.0 }

on complete of instance I (quest Q, current streak s AFTER this completion):
    xp = round( (BASE_COMPLETE + STREAK_BONUS(s)) * CADENCE_MULT[Q.cadence] )
    insert xp_event(amount = xp, reason = 'quest_complete', source = I)
```
- XP **balance** = `sum(xp_event.amount)`. Never store a running total field; always sum the ledger.
- Levels (display only, `xp_display='detailed'`): `level = floor(sqrt(balance / 50)) + 1`. Simple mode
  just shows the balance + today's gain.
- **Anti‑cheat:** XP is only ever inserted by the `apply_quest_event` definer RPC. Clients never write
  `xp_event` directly (RLS forbids it). The client may show an **optimistic** XP preview using the same
  formula, then adopt the server value on sync.

## 6. Streaks

A streak counts **consecutive completed periods** for a quest.

```
on completion of instance I (quest Q, period_key p):
    let prev = streak row for Q (current, longest, last_period_key)
    if p is the period IMMEDIATELY AFTER prev.last_period_key (per Q.cadence):
        current = prev.current + 1
    elif p == prev.last_period_key:        # idempotent re‑complete, no change
        current = prev.current
    else:                                   # gap → streak resets to 1 (this completion)
        current = 1
    longest = max(prev.longest, current)
    last_period_key = p

on missed period (detected by nightly_rollover for a quest that had an active instance left
    incomplete in a now‑past period):
    current = 0     # streak broken; longest preserved
```
- "Immediately after" is cadence‑aware: next day / next ISO week / next month / next year.
- `current` per quest; **per‑habit longest** (shown in Stats) = max over the habit's quests.
- Clients show an optimistic +1 on completion; server reconciles.

## 7. Idempotency (why offline is safe)

- `quest_event.id` (client UUID) is the dedupe key → replays are no‑ops.
- `quest_instance` unique `(quest_id, period_key)` → can't create duplicate periods.
- `sleep_log` unique `(user_id, night_of)` → re‑logging a night upserts.
- XP is derived from completions, which are idempotent → XP can't be double‑granted.

## 8. Worked example (use this as a test vector)

Habit "Run" (`#E8743B`). Weekly quest "Run" target 1, weekdays `[mon,wed,fri]`.
→ generates 3 daily children (mon/wed/fri). On Wed 2026‑06‑10 the user taps the Wed child once:
- instance `2026-06-10` progress 0→1, target 1 → completed.
- streak for that child: if Mon's child completed → current 2 else 1.
- XP: `(10 + STREAK_BONUS(current)) * 1.0`. With current=2 → `10 + 4 = 14` XP.
Every client must reproduce these numbers.

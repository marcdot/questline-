# 02 — Data Model (canonical contract)

> `CONTRACT_VERSION: 1`. This is the shared truth every client and the backend must match exactly.
> Field names, types and enums here are normative. Additive changes only within v1; breaking changes
> bump the version and require lead sign‑off (touches all clients). SQL DDL lives in `04`; this file is
> the language‑neutral definition + invariants.

## Entity overview

```
user 1───* habit 1───* quest 1───* quest_instance 1───* quest_event
                                         (a period)        (tap / complete, idempotent)
user 1───* sleep_log
user 1───* xp_event           (ledger; balance = sum)
user 1───* streak             (one row per quest, derived but stored)
user 1───1 user_settings
```

## Enums

```
cadence       = daily | weekly | monthly | yearly
weekday       = mon | tue | wed | thu | fri | sat | sun   (ISO order)
event_kind    = increment | complete | uncomplete
sync_state    = none | pending | synced | error
theme         = system | light | dark
xp_display    = simple | detailed
```

## Entities

### user  (managed by Supabase Auth; profile fields here)
| field | type | notes |
|---|---|---|
| id | uuid (PK) | == auth user id |
| email | text | from auth |
| display_name | text | editable |
| avatar_url | text? | optional |
| created_at | timestamptz | |

### user_settings  (1:1 with user)
| field | type | notes |
|---|---|---|
| user_id | uuid (PK, FK→user) | |
| theme | theme | default `system` |
| xp_display | xp_display | default `simple` |
| calendar_sync_enabled | bool | master toggle, default false |
| reminders_enabled | bool | default true |
| google_connected | bool | true once OAuth Calendar scope granted |
| updated_at | timestamptz | |

### habit
| field | type | notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK→user) | owner |
| name | text | e.g. "Run" |
| color | text | hex `#RRGGBB`; the single source of a quest's colour |
| sort_order | int | manual ordering |
| archived | bool | soft delete; default false |
| created_at | timestamptz | |
**Invariant:** a quest's display colour is **always derived from its habit**, never stored on the quest.

### quest
| field | type | notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK→user) | |
| habit_id | uuid? (FK→habit) | nullable: a quest *may* be standalone, but colour then defaults to neutral |
| title | text | |
| cadence | cadence | daily/weekly/monthly/yearly |
| target_count | int | n in "n/n"; default 1 |
| unit | text? | optional label e.g. "km", "pages", "min" |
| weekdays | weekday[] | only meaningful for cadence ≥ weekly; empty = aggregate only |
| generated_parent_id | uuid? (FK→quest) | set on auto‑generated daily children; null on the parent |
| calendar_sync | bool | per‑quest opt‑in; default false |
| reminder_time | time? | optional local reminder |
| active_from | date | when the quest starts producing instances |
| active_to | date? | optional end |
| archived | bool | soft delete |
| created_at | timestamptz | |
**Invariants:**
- If `cadence ≥ weekly` and `weekdays` non‑empty → daily child quests are generated on those weekdays
  (`generated_parent_id` = this quest). Algorithm: `05 §Quest generation`.
- If `weekdays` empty → only the aggregate quest exists; no children.
- A generated child always has `cadence = daily`, inherits `habit_id`, `title`, `target_count`, `unit`.

### quest_instance  (one occurrence of a quest in its period — what the user actually taps)
| field | type | notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK→user) | |
| quest_id | uuid (FK→quest) | |
| period_key | text | canonical period id, e.g. `2026-06-07` (daily), `2026-W23` (weekly), `2026-06` (monthly), `2026` (yearly) |
| progress | int | current count, 0..target_count |
| target_count | int | snapshot of quest target at instance creation |
| completed | bool | progress ≥ target |
| completed_at | timestamptz? | |
| created_at | timestamptz | |
**Invariants:**
- Unique `(quest_id, period_key)` — exactly one instance per quest per period.
- `completed == (progress >= target_count)`; both kept consistent server‑side.
- `period_key` format is normative; see `05 §Period keys`.

### quest_event  (idempotent ledger of interactions — powers offline replay safety)
| field | type | notes |
|---|---|---|
| id | uuid (PK) | client‑generated UUID = idempotency key |
| user_id | uuid (FK→user) | |
| instance_id | uuid (FK→quest_instance) | |
| kind | event_kind | increment / complete / uncomplete |
| delta | int | +1 for increment, +remaining for complete, etc. |
| created_at | timestamptz | client time of action |
**Invariant:** server applies each `id` **at most once** (dedupe). Re‑sending the queue is a no‑op.

### xp_event  (XP ledger; balance is the sum)
| field | type | notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK→user) | |
| source_instance_id | uuid? (FK→quest_instance) | what earned it |
| amount | int | XP granted (see `05 §XP`) |
| reason | text | e.g. `quest_complete`, `streak_bonus` |
| created_at | timestamptz | |

### streak  (one row per quest; stored for cheap reads, recomputed on change)
| field | type | notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK→user) | |
| quest_id | uuid (FK→quest) | |
| current | int | current consecutive completed periods |
| longest | int | best ever |
| last_period_key | text? | last period counted |
**Invariant:** recomputed by the rule in `05 §Streaks` whenever an instance completes/uncompletes.

### sleep_log
| field | type | notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK→user) | |
| night_of | date | the date the night *belongs to* (the morning's previous night) |
| hours | numeric(3,1) | e.g. 7.5 |
| created_at | timestamptz | |
**Invariant:** unique `(user_id, night_of)` — one sleep figure per night (upsert).

## Ownership rule (enforced by RLS, see `04`)

Every row with a `user_id` is readable/writable **only** by that user. No cross‑user access in MVP.

## Derived values (never stored, always computed)

- Quest **colour** = its habit's `color` (or neutral token if `habit_id` is null).
- XP **balance** = `sum(xp_event.amount)`.
- "Today's status" = completion ratio across today's daily instances.

## Minimal seed (onboarding creates exactly this)

1 habit ("Run", colour `#E8743B`), 1 daily quest ("Go for a run", target 1) → its first
`quest_instance` for today. Gives the new user something to tap on the home screen immediately.

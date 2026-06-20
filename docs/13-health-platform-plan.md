# 13 — Health Platform Plan (calorie tracking — future)

> **Planning only — not built.** Phase 1 (shipped, Q-002A) is MET-based walk
> calorie *estimation*. This doc specs how Questline could grow into a full
> calorie counter (food logging, BMR, daily net) and how Apple Health feeds in.
> No food-logging UI exists yet; build nothing here without a new ticket.

## Phase 1 — what shipped (for reference)

- `user_settings.weight_kg`, `user_settings.walk_pace` (migration 009).
- `lib/domain/calories.ts`: `kcal = MET(pace) × weight_kg × minutes/60`.
- A walk quest = "walk" in habit/title; its `target_count` is read as minutes.
- kcal pill on completed walk cards (home) + a kcal total in Stats.

## Phase 2 — full calorie tracking (proposed)

### Data model

Extend the measurement idea from Q-001 into an explicit `health_entry` ledger
(append-only, like `xp_event` — cheap to sum, easy to audit):

| field | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK→user_profile | RLS: own rows |
| kind | enum | `calories_consumed` \| `calories_burned` \| `weight` |
| amount | numeric | kcal, or kg for `weight` |
| protein_g / carbs_g / fat_g | numeric? | macros, for `calories_consumed` |
| source | text | `manual` \| `walk_quest` \| `apple_health` |
| source_instance_id | uuid? FK→quest_instance | links a burn back to its quest |
| logged_for | date | the day it counts toward (local) |
| created_at | timestamptz | |

Derived (never stored): **BMR** (Mifflin-St Jeor:
`10·kg + 6.25·cm − 5·age + s`), **daily net** = consumed − (BMR + burned).
Add `height_cm`, `birth_year`, `sex` to `user_settings` for BMR.

### Schema plan (additive migrations)

1. `health_kind` enum + `health_entry` table + RLS (`own rows` select/modify).
2. Index `(user_id, logged_for)` for day/range rollups.
3. `user_settings`: `height_cm`, `birth_year`, `sex`, `daily_kcal_target`.
4. Walk completions write a `calories_burned` row via the existing
   `apply_quest_event` RPC (keep writes server-side; clients never raw-insert).

### UI plan (fits existing patterns)

- **Add tab** gains a "Food" form (name, kcal, optional macros) → `log_food` RPC,
  mirroring the current Sleep tab.
- **Stats** gains a "Nutrition" section: daily net (consumed − burned − BMR) as a
  bar, reusing the period filter + the Totals card style already built for Q-001.
- **Home MiniDashboard** gains a small "kcal in / out" figure for today.
- Empty/loading/semantic-colour conventions per `docs/12-feedback-system.md`.

## Apple Health (HealthKit) integration

HealthKit is **native iOS only** — unreachable from a PWA/browser. The bridge
is **iOS Shortcuts → Supabase Edge Function** (no native app needed):

1. A Shortcut reads HealthKit (`activeEnergyBurned`, `stepCount`,
   `distanceWalkingRunning`) and POSTs JSON to a new `health_ingest` Edge
   Function, authenticated with a per-user shared secret.
2. The function validates the secret + payload and inserts `health_entry` rows
   (`source = apple_health`), deduping by date+kind.
3. A scheduled Shortcut automation runs each morning — no manual action.
4. Stats/Home read the same `health_entry` table; real `activeEnergyBurned`
   supersedes the formula estimate for days that have it.

**Pros:** works today, zero native code, one-time user setup.
**Cons:** user sets up the Shortcut once; read-only (can't write quests back).

References: iOS Shortcuts → Supabase Edge Function (rapidevelopers HealthKit
guide); Compendium walking METs; ACSM walk/run metabolic formulas (exrx.net).

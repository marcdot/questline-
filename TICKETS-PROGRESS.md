# Tickets Progress — batch tickets/2026-06-20

All four tickets complete. Branch `tickets/2026-06-20`, one PR for review.
Every group passed the gate (`lint && test && tsc && build`) before commit.

## Done

| Group | Tickets | Commit |
|---|---|---|
| 1 | Q-004 — semantic feedback colours + docs | `e37207c` |
| 2 | Q-003 — tap-to-undo completion | `f35b463` |
| 3a | Q-001 — aggregated measurement totals | `055e2a4` |
| 3b | Q-002 — walk calories + health-platform plan | `7d907ba` |

## Key decisions / assumptions

- **Q-004:** the design system already defined `--success/--danger/--warning/
  --info`. Work was applying them, not inventing tokens. "Check your email"
  moved from the shared error state (red) to a new success notice (green). Every
  semantic message now pairs colour with an icon + role (not colour alone). A
  full toast framework was *documented*, not built (AC only required docs).
- **Q-003:** the `uncomplete` event kind already existed server-side — wired it
  to a plain tap on a completed card with an "↩ Undo" affordance. Added
  **migration 008** (additive trigger) so quest-completion XP is granted at most
  once per instance, closing the complete→undo→complete XP-farm the undo opens.
  Optimistic streak/XP on the card revert; the authoritative streak row is left
  as-is on uncomplete (server doesn't reverse it) — acceptable for the undo flow.
- **Q-001:** no schema change. Sums logged `progress` by quest `unit` over the
  visible range, reusing instances already fetched for the status grid.
- **Q-002:** `target_count` is read as **minutes** for walks (no timer exists in
  the app) — a planned-duration estimate, marked with a ponytail comment. Walk
  detection is a name-match heuristic (habit/title contains "walk"). Phase 2
  (food logging / Apple Health) is planning only — `docs/13`.

## ⚠️ Deploy note (not auto-applied)

Migrations **008** and **009** are additive SQL in `supabase/migrations/`. Per
`DEPLOY-RUNBOOK.md`, migrations are applied via the Supabase dashboard/SQL
editor — run both against dev then prod. Until then, the Q-002 weight/pace
columns and the Q-003 XP-once trigger don't exist server-side (the app degrades
gracefully: kcal shows 0 without weight; undo still works, but XP could be
re-granted until 008 is applied).

## Remaining

None — all open tickets in the folder are addressed.

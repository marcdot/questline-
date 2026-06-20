# Questline — Ticket Batch Runbook (for an autonomous CLI agent)

Work the tickets in `C:\Users\Cutom\Desktop\brain\Brain\Tickets\questline`. Plan → batch
overlapping tickets → implement → test → repeat until the tickets are done or context runs low.

## 1. Before touching code
1. Read **every** ticket in the tickets folder. For each, note: id, what it asks, acceptance.
2. Read repo context: `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/02-data-model.md`,
   `docs/04-backend-supabase.md`, `DEPLOY-RUNBOOK.md`.
3. **Group tickets that touch the same file / feature / table** and implement each group as one
   change — two flies, one swing. Write the grouped plan out before coding.
4. Order groups: lowest blast-radius first, respect dependencies.

## 2. Implementing a group (lazy: smallest diff that satisfies the tickets)
- Reach for existing deps / native / stdlib before writing new code. No new dependency for what a
  few lines do. No speculative abstractions beyond what the tickets ask.
- **Database — careful with relations and size:**
  - Migrations are **additive and numbered** — add the next file in `supabase/migrations/`, never
    rewrite an existing one.
  - Keep **RLS** intact: every table keeps its user-scoped policy; `xp_event` / `quest_event`
    stay client-write-blocked — mutate them only via `SECURITY DEFINER` RPCs guarded by `auth.uid()`.
  - **Check FKs / cascades before changing columns or deleting rows** — a delete can cascade across
    relations. Confirm `on delete` behavior first.
  - **Mind data size:** don't pull unbounded rows to the client — `limit`/paginate, and index any
    column you filter or sort on.
  - Never put the **service-role key** in `webapp/` (anon key + RLS only).
- **Web code:** Next.js 16 — per `AGENTS.md`, read `node_modules/next/dist/docs/` before writing
  anything Next-specific. Authed route groups are `force-dynamic`. Match surrounding code style.

## 3. Test gate — every group, before moving on
From `webapp/`:
```
npm run lint && npm run test && npx tsc --noEmit && npm run build
```
All green before proceeding. If the change is visible in the browser, verify on the dev server.
A ticket isn't done until its check passes.

## 4. Commit
- One commit per ticket-group on a branch `tickets/<yyyy-mm-dd>` (**not** `master`).
- Message: `<feat|fix>: <summary> (closes <ticket-ids>)`. Push the branch.
- Keep one PR open for the batch so the user reviews before merge.

## 5. Token / context budget — the loop
- After each group, check remaining context.
  - **Plenty left (>~20%):** continue to the next group.
  - **Getting tight, or several groups done:** stop cleanly — append to `TICKETS-PROGRESS.md`
    (groups done, groups remaining, decisions/assumptions made, anything blocked), then end with a
    short resume summary. Don't start a group you can't finish + test.

## Don'ts
- No new dependency for a few lines of work. No speculative features beyond the tickets.
- Don't edit committed migrations or any secret file (`.env`, `keys.json` are gitignored — leave them).
- Don't land work on `master` directly, and don't mark a ticket done with a failing check.

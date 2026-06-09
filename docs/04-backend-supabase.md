# 04 — Backend (Supabase)

> The shared backend. Build this ONCE (Plan Phase A) before the first client. Everything here is
> server‑side: schema, Row‑Level Security, auth, and the Google Calendar sync function. Clients only
> ever use the **anon key** + URL; the **service‑role key** lives only in Edge Functions and CI secrets.

## 1. Project setup

1. Create two Supabase projects: `questline-dev`, `questline-prod`.
2. Record for each: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Enable Auth providers: **Email** (magic link or password — choose password for MVP) and **Google**.
4. In Google Cloud Console create OAuth credentials; enable the **Google Calendar API**; set scopes
   (§5). Put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` into Supabase Auth Google provider config.
5. Never commit any key. Provide `.env.example` per client (URL + anon key only).

## 2. Schema (DDL) — run in the SQL editor / as a migration

> Implements `02-data-model.md` exactly. Enums first, then tables, then RLS (§4), then functions (§6).

```sql
-- enums
create type cadence    as enum ('daily','weekly','monthly','yearly');
create type event_kind as enum ('increment','complete','uncomplete');
create type theme_pref as enum ('system','light','dark');
create type xp_display as enum ('simple','detailed');

-- profile (mirrors auth.users)
create table public.user_profile (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.user_profile on delete cascade,
  theme theme_pref not null default 'system',
  xp_display xp_display not null default 'simple',
  calendar_sync_enabled bool not null default false,
  reminders_enabled bool not null default true,
  google_connected bool not null default false,
  updated_at timestamptz not null default now()
);

create table public.habit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  name text not null,
  color text not null,                 -- #RRGGBB
  sort_order int not null default 0,
  archived bool not null default false,
  created_at timestamptz not null default now()
);

create table public.quest (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  habit_id uuid references public.habit on delete set null,
  title text not null,
  cadence cadence not null,
  target_count int not null default 1 check (target_count >= 1),
  unit text,
  weekdays text[] not null default '{}',          -- subset of mon..sun
  generated_parent_id uuid references public.quest on delete cascade,
  calendar_sync bool not null default false,
  reminder_time time,
  active_from date not null default current_date,
  active_to date,
  archived bool not null default false,
  created_at timestamptz not null default now()
);

create table public.quest_instance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  quest_id uuid not null references public.quest on delete cascade,
  period_key text not null,
  progress int not null default 0 check (progress >= 0),
  target_count int not null,
  completed bool not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quest_id, period_key)
);

create table public.quest_event (
  id uuid primary key,                  -- client‑generated; idempotency key
  user_id uuid not null references public.user_profile on delete cascade,
  instance_id uuid not null references public.quest_instance on delete cascade,
  kind event_kind not null,
  delta int not null,
  created_at timestamptz not null default now()
);

create table public.xp_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  source_instance_id uuid references public.quest_instance on delete set null,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.streak (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  quest_id uuid not null references public.quest on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  last_period_key text,
  unique (quest_id)
);

create table public.sleep_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  night_of date not null,
  hours numeric(3,1) not null check (hours >= 0 and hours <= 24),
  created_at timestamptz not null default now(),
  unique (user_id, night_of)
);

-- calendar mapping (which instance → which google event)
create table public.calendar_link (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profile on delete cascade,
  quest_id uuid not null references public.quest on delete cascade,
  google_event_id text,
  state text not null default 'pending',   -- none|pending|synced|error
  updated_at timestamptz not null default now(),
  unique (quest_id)
);

-- helpful indexes
create index on public.quest (user_id, habit_id);
create index on public.quest_instance (user_id, period_key);
create index on public.xp_event (user_id, created_at);
create index on public.sleep_log (user_id, night_of);
```

## 3. New‑user bootstrap (trigger)

On `auth.users` insert → create `user_profile` + `user_settings`, then seed the onboarding habit/quest
(`02 §Minimal seed`). Implement as an `after insert` trigger calling a `security definer` function, OR
do the seed from the client's onboarding flow — **pick one and state it in each client's BUILD**. Default:
trigger creates profile + settings; **client onboarding** creates the first habit/quest (so the user
chooses the name/colour).

## 4. Row‑Level Security (mandatory — clients are untrusted)

```sql
alter table public.user_profile   enable row level security;
alter table public.user_settings  enable row level security;
alter table public.habit          enable row level security;
alter table public.quest          enable row level security;
alter table public.quest_instance enable row level security;
alter table public.quest_event    enable row level security;
alter table public.xp_event       enable row level security;
alter table public.streak         enable row level security;
alter table public.sleep_log      enable row level security;
alter table public.calendar_link  enable row level security;

-- pattern, applied to every table with a user_id (and id=auth.uid() for user_profile):
create policy "own rows - select" on public.habit
  for select using (user_id = auth.uid());
create policy "own rows - modify" on public.habit
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- repeat the two policies for every table above (user_profile uses id = auth.uid()).
```

**Rule:** XP and streak writes should ideally be performed by `security definer` RPCs (§6) so clients
can't grant themselves arbitrary XP. Direct client writes to `xp_event` are disallowed by policy; only
the RPC (running as definer) inserts them.

## 5. Auth & Google scopes

- App login: Supabase Auth (email/password + Google sign‑in).
- Calendar requires extra scope: `https://www.googleapis.com/auth/calendar.events`. Request it during
  Google OAuth (incremental auth) only when the user enables Calendar sync. Store the **refresh token
  server‑side** (Supabase Auth provider tokens / a secured table), never on the client.
- `user_settings.google_connected` flips true once the Calendar scope is granted.

## 6. Server functions (RPC + Edge)

Define these as the **API surface** clients call (so business rules stay server‑side):

| Function | Type | Purpose |
|---|---|---|
| `apply_quest_event(event_id, instance_id, kind, delta, client_ts)` | RPC (definer) | Idempotent: dedupe by `event_id`; update `quest_instance.progress/completed`; on complete → grant XP (`05 §XP`) + recompute streak (`05 §Streaks`). Returns the new instance + xp balance + streak. |
| `ensure_instances(date)` | RPC (definer) | Materialise today's/this‑period's `quest_instance` rows for the user from their active quests (incl. generated dailies). Idempotent via unique `(quest_id,period_key)`. |
| `generate_child_quests(quest_id)` | RPC (definer) | From a weekly+ quest with weekdays, create/update its daily child quests (`05 §Quest generation`). |
| `log_sleep(night_of, hours)` | RPC (definer) | Upsert `sleep_log`. |
| `calendar_sync(quest_id, op)` | Edge Function | Create/update/delete the Google Calendar event for a quest using the stored refresh token; writes `calendar_link`. |
| `nightly_rollover()` | Edge Function (cron) | Runs ~00:05 user‑relevant TZ: ensure next period instances, recompute streak breaks for missed periods. |

> The build agents may implement the optimistic client path first and call `apply_quest_event` on
> sync. The RPC is the **authority**; the client value is a preview.

## 7. What each client needs from this doc

- The table/field names (match `02`).
- The four read patterns: *today's instances*, *habits+quests*, *xp ledger/balance*, *sleep month*.
- The write path: **always** through `apply_quest_event` / `log_sleep` / create RPCs, never raw XP.
- Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` only.

/**
 * Questline — TypeScript types mirroring docs/02 exactly.
 *
 * This is the canonical client-side type contract. Every table, enum, RPC
 * parameter, and return type maps directly to the Supabase schema.
 */

/* ─── Enums (docs/02 §Enums) ─── */

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type EventKind = 'increment' | 'complete' | 'uncomplete';
export type SyncState = 'none' | 'pending' | 'synced' | 'error';
export type Theme = 'system' | 'light' | 'dark';
export type XpDisplay = 'simple' | 'detailed';

/* ─── Tables (docs/02 §Entities) ─── */

/** user_profile (mirrors auth.users) */
export interface UserProfile {
  id: string;               // uuid PK = auth user id
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;       // timestamptz
}

/** user_settings (1:1 with user) */
export interface UserSettings {
  user_id: string;          // uuid PK FK→user_profile
  theme: Theme;             // default 'system'
  xp_display: XpDisplay;   // default 'simple'
  calendar_sync_enabled: boolean;  // default false
  reminders_enabled: boolean;      // default true
  google_connected: boolean;       // default false
  updated_at: string;       // timestamptz
}

/** habit */
export interface Habit {
  id: string;               // uuid PK
  user_id: string;          // uuid FK→user_profile
  name: string;
  color: string;            // #RRGGBB
  sort_order: number;       // int, default 0
  archived: boolean;        // default false
  created_at: string;       // timestamptz
}

/** quest */
export interface Quest {
  id: string;               // uuid PK
  user_id: string;          // uuid FK→user_profile
  habit_id: string | null;  // uuid FK→habit, nullable
  title: string;
  cadence: Cadence;
  target_count: number;     // int ≥1, default 1
  unit: string | null;      // optional label e.g. "km", "pages"
  weekdays: Weekday[];      // subset of mon..sun, empty for aggregate-only
  generated_parent_id: string | null; // uuid FK→quest
  calendar_sync: boolean;   // default false
  reminder_time: string | null; // time, nullable
  active_from: string;      // date, default current_date
  active_to: string | null; // date, nullable
  archived: boolean;        // default false
  created_at: string;       // timestamptz
}

/** quest_instance (one occurrence per period) */
export interface QuestInstance {
  id: string;               // uuid PK
  user_id: string;          // uuid FK→user_profile
  quest_id: string;         // uuid FK→quest
  period_key: string;       // text, canonical period id
  progress: number;         // int ≥0, default 0
  target_count: number;     // int snapshot
  completed: boolean;       // default false
  completed_at: string | null; // timestamptz, nullable
  created_at: string;       // timestamptz
}

/** quest_event (idempotent event ledger) */
export interface QuestEvent {
  id: string;               // uuid PK (client-generated = idempotency key)
  user_id: string;          // uuid FK→user_profile
  instance_id: string;      // uuid FK→quest_instance
  kind: EventKind;
  delta: number;            // int
  created_at: string;       // timestamptz
}

/** xp_event (XP ledger; balance = sum) */
export interface XpEvent {
  id: string;               // uuid PK
  user_id: string;          // uuid FK→user_profile
  source_instance_id: string | null; // uuid FK→quest_instance
  amount: number;           // int
  reason: string;           // text
  created_at: string;       // timestamptz
}

/** streak (one row per quest) */
export interface Streak {
  id: string;               // uuid PK
  user_id: string;          // uuid FK→user_profile
  quest_id: string;         // uuid FK→quest, unique
  current: number;          // int, default 0
  longest: number;          // int, default 0
  last_period_key: string | null; // text
}

/** sleep_log */
export interface SleepLog {
  id: string;               // uuid PK
  user_id: string;          // uuid FK→user_profile
  night_of: string;         // date
  hours: number;            // numeric(3,1)
  created_at: string;       // timestamptz
}

/** calendar_link (maps quest → Google Calendar event) */
export interface CalendarLink {
  id: string;               // uuid PK
  user_id: string;          // uuid FK→user_profile
  quest_id: string;         // uuid FK→quest, unique
  google_event_id: string | null; // text
  state: SyncState;         // default 'pending'
  updated_at: string;       // timestamptz
}

/* ─── RPC types (docs/04 §6) ─── */

/** Parameters for apply_quest_event */
export interface ApplyQuestEventParams {
  p_event_id: string;
  p_instance_id: string;
  p_kind: EventKind;
  p_delta: number;
  p_client_ts?: string;     // timestamptz, default now()
}

/** Return value from apply_quest_event */
export interface ApplyQuestEventResult {
  applied: boolean;
  instance: QuestInstance;
  xp_granted: number;
  streak_after: number;
}

/** Parameters for ensure_instances */
export interface EnsureInstancesParams {
  p_date: string;           // date
}

/** Parameters for log_sleep */
export interface LogSleepParams {
  p_night_of: string;       // date
  p_hours: number;          // numeric(3,1)
}

/** Return value from log_sleep */
export interface LogSleepResult {
  id: string;
  night_of: string;
  hours: number;
}

/** Parameters for generate_child_quests */
export interface GenerateChildQuestsParams {
  p_quest_id: string;
}

/* ─── Domain types (docs/05) ─── */

export interface XpInput {
  streak: number;
  cadence: Cadence;
}

export interface StreakInput {
  last_period_key: string | null;
  current_streak: number;
  new_period_key: string;
  cadence: Cadence;
}

export interface StreakResult {
  new_streak: number;
  longest: number;
}

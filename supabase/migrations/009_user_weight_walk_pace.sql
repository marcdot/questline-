-- 009 — User weight + default walk pace (Q-002 walk calorie burn)
--
-- Additive columns on user_settings for MET-based walk-calorie estimation:
--   kcal = MET(pace) × weight_kg × duration_hours
-- Both nullable / defaulted so existing rows are unaffected. RLS already scopes
-- user_settings to the owner (own rows policy), so no policy change is needed.

alter table public.user_settings
  add column if not exists weight_kg numeric(5,1)
    check (weight_kg is null or (weight_kg > 0 and weight_kg < 1000)),
  add column if not exists walk_pace text not null default 'moderate'
    check (walk_pace in ('slow','moderate','brisk','fast','very_fast'));

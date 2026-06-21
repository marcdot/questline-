-- ============================================================================
-- Questline — GDPR data export + account erasure (additive migration #010)
-- Ticket Q-005. Implements Art. 15/20 (access/portability) and Art. 17 (erasure).
-- Additive only: two new functions, no table/RLS changes. Existing migrations
-- and RLS policies are untouched.
-- ============================================================================

-- ############################################################################
-- §1 — export_user_data()  (Art. 15 access / Art. 20 portability)
-- ############################################################################
-- Returns ALL of the caller's personal data as one JSON document.
-- SECURITY INVOKER (default): runs as the calling user, so existing RLS "own
-- rows" SELECT policies scope every table to the caller automatically. The
-- explicit `= auth.uid()` filters are belt-and-suspenders on top of RLS.
-- The Google refresh token (google_token) is a secret credential, NOT exported;
-- whether Calendar is connected is already in user_settings.google_connected.
create or replace function public.export_user_data()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'exported_at', now(),
      'format', 'Questline personal-data export (GDPR Art. 15 / Art. 20)',
      'note', 'All personal data Questline stores about you, except secret '
            || 'credentials. The Google Calendar refresh token is a security '
            || 'credential and is not included; user_settings.google_connected '
            || 'shows whether Calendar is linked.'
    ),
    'profile',         (select to_jsonb(p) from public.user_profile  p  where p.id      = auth.uid()),
    'settings',        (select to_jsonb(s) from public.user_settings s  where s.user_id = auth.uid()),
    'habits',          coalesce((select jsonb_agg(to_jsonb(h))  from public.habit          h  where h.user_id  = auth.uid()), '[]'::jsonb),
    'quests',          coalesce((select jsonb_agg(to_jsonb(q))  from public.quest          q  where q.user_id  = auth.uid()), '[]'::jsonb),
    'quest_instances', coalesce((select jsonb_agg(to_jsonb(qi)) from public.quest_instance qi where qi.user_id = auth.uid()), '[]'::jsonb),
    'quest_events',    coalesce((select jsonb_agg(to_jsonb(qe)) from public.quest_event    qe where qe.user_id = auth.uid()), '[]'::jsonb),
    'xp_events',       coalesce((select jsonb_agg(to_jsonb(xe)) from public.xp_event       xe where xe.user_id = auth.uid()), '[]'::jsonb),
    'streaks',         coalesce((select jsonb_agg(to_jsonb(st)) from public.streak         st where st.user_id = auth.uid()), '[]'::jsonb),
    'sleep_logs',      coalesce((select jsonb_agg(to_jsonb(sl)) from public.sleep_log      sl where sl.user_id = auth.uid()), '[]'::jsonb),
    'calendar_links',  coalesce((select jsonb_agg(to_jsonb(cl)) from public.calendar_link  cl where cl.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

revoke all     on function public.export_user_data() from public, anon;
grant  execute on function public.export_user_data() to authenticated;

-- ############################################################################
-- §2 — admin_delete_user()  (Art. 17 erasure / "right to be forgotten")
-- ############################################################################
-- Self-service account deletion. The webapp already calls this RPC from the
-- profile "Delete account" button, but the function never existed — so deletion
-- silently failed. This defines it.
--
-- Deleting the auth.users row cascades through user_profile (ON DELETE CASCADE)
-- to EVERY public table that references it — including google_token — so one
-- statement erases all of the user's data. The Google *grant* (at Google's end)
-- is revoked client-side before this runs (profile delete handler calls the
-- calendar disconnect Edge Function); this only removes our stored copy.
--
-- SECURITY DEFINER so it can delete from auth.users; search_path pinned; the
-- caller can only ever delete THEMSELVES (auth.uid()), never another user.
create or replace function public.admin_delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- ponytail: one cascade deletes everything; no per-table deletes needed
  -- (all user-owned FKs are ON DELETE CASCADE off user_profile → auth.users).
  delete from auth.users where id = v_uid;
end;
$$;

revoke all     on function public.admin_delete_user() from public, anon;
grant  execute on function public.admin_delete_user() to authenticated;

-- ============================================================================
-- ✓ Migration 010 — GDPR export + erasure RPCs
-- ============================================================================

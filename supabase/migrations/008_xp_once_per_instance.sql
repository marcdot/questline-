-- 008 — Grant quest-completion XP at most once per instance (Q-003 anti-cheat)
--
-- Q-003 adds tap-to-undo (the `uncomplete` event already exists). Without a
-- guard, complete → uncomplete → complete would re-run the XP grant in
-- apply_quest_event and let a user farm XP by toggling. Rather than rewrite the
-- large apply_quest_event function, this is a small ADDITIVE trigger: a second
-- `quest_complete` xp_event for the same instance is silently skipped.
--
-- apply_quest_event still returns its computed xp_granted, but the home screen
-- reconciles XP by re-reading sum(xp_event), so the UI stays correct.
-- RLS is untouched; xp_event remains client-write-blocked (definer RPC only).

create or replace function public.xp_dedupe_complete()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.reason = 'quest_complete'
     and new.source_instance_id is not null
     and exists (
       select 1 from public.xp_event
       where source_instance_id = new.source_instance_id
         and reason = 'quest_complete'
     )
  then
    return null;  -- duplicate completion XP — skip the insert
  end if;
  return new;
end;
$$;

drop trigger if exists xp_dedupe_complete_trg on public.xp_event;
create trigger xp_dedupe_complete_trg
  before insert on public.xp_event
  for each row execute function public.xp_dedupe_complete();

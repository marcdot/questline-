'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import HabitColorPicker, { HABIT_COLORS, isValidHexColor } from '@/components/HabitColorPicker';
import type { Habit } from '@/lib/types';

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Derived per-habit stats ─── */
interface HabitRow {
  habit: Habit;
  questCount: number;
  bestStreak: number;
}

/* ─── Raw shapes ─── */
interface RawQuest { id: string; habit_id: string | null; archived: boolean }
interface RawStreak { quest_id: string; longest: number }

type EditingState = null | 'new' | string; // habit id when editing

export default function HabitsPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HabitRow[]>([]);

  /* Editor state */
  const [editing, setEditing] = useState<EditingState>(null);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState<string>(HABIT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─── Init ─── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    init();
  }, [supabase]);

  /* ─── Fetch habits + derived stats ─── */
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: rawHabits } = await supabase
        .from('habit')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      const habits = (rawHabits ?? []) as unknown as Habit[];

      const { data: rawQuests } = await supabase
        .from('quest')
        .select('id, habit_id, archived')
        .eq('user_id', userId)
        .eq('archived', false);
      const quests = (rawQuests ?? []) as RawQuest[];

      const questIds = quests.map((q) => q.id);
      let streaks: RawStreak[] = [];
      if (questIds.length > 0) {
        const { data: rawStreaks } = await supabase
          .from('streak')
          .select('quest_id, longest')
          .in('quest_id', questIds);
        streaks = (rawStreaks ?? []) as RawStreak[];
      }

      // quest_id → habit_id
      const questHabit = new Map<string, string | null>();
      for (const q of quests) questHabit.set(q.id, q.habit_id);

      // habit_id → best longest streak
      const bestByHabit = new Map<string, number>();
      for (const s of streaks) {
        const hid = questHabit.get(s.quest_id);
        if (!hid) continue;
        bestByHabit.set(hid, Math.max(bestByHabit.get(hid) ?? 0, s.longest));
      }

      // habit_id → quest count
      const countByHabit = new Map<string, number>();
      for (const q of quests) {
        if (!q.habit_id) continue;
        countByHabit.set(q.habit_id, (countByHabit.get(q.habit_id) ?? 0) + 1);
      }

      setRows(
        habits.map((h) => ({
          habit: h,
          questCount: countByHabit.get(h.id) ?? 0,
          bestStreak: bestByHabit.get(h.id) ?? 0,
        })),
      );
    } catch (err) {
      console.error('Failed to fetch habits:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) fetchData();
  }, [userId, fetchData]);

  /* ─── Editor helpers ─── */
  const openNew = useCallback(() => {
    // Pick first unused colour as a sensible default
    const used = new Set(rows.map((r) => r.habit.color.toLowerCase()));
    const free = HABIT_COLORS.find((c) => !used.has(c.toLowerCase())) ?? HABIT_COLORS[0];
    setEditing('new');
    setDraftName('');
    setDraftColor(free);
    setError(null);
  }, [rows]);

  const openEdit = useCallback((row: HabitRow) => {
    setEditing(row.habit.id);
    setDraftName(row.habit.name);
    setDraftColor(row.habit.color);
    setError(null);
  }, []);

  const closeEditor = useCallback(() => {
    setEditing(null);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    const name = draftName.trim();
    if (!name) { setError('Name is required'); return; }
    if (name.length > 60) { setError('Name must be 60 characters or fewer'); return; }
    if (!isValidHexColor(draftColor)) { setError('Pick a colour'); return; }

    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        const { error: insErr } = await supabase
          .from('habit')
          .insert({ user_id: userId, name, color: draftColor });
        if (insErr) throw insErr;
      } else if (editing) {
        const { error: updErr } = await supabase
          .from('habit')
          .update({ name, color: draftColor })
          .eq('id', editing)
          .eq('user_id', userId);
        if (updErr) throw updErr;
      }
      closeEditor();
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save habit');
    } finally {
      setSaving(false);
    }
  }, [userId, draftName, draftColor, editing, supabase, closeEditor, fetchData]);

  const handleArchive = useCallback(async (row: HabitRow) => {
    if (!userId) return;
    const confirmed = window.confirm(
      `Archive "${row.habit.name}"? Its quests stay, but it's removed from this list. You can't undo this in-app yet.`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const { error: archErr } = await supabase
        .from('habit')
        .update({ archived: true })
        .eq('id', row.habit.id)
        .eq('user_id', userId);
      if (archErr) throw archErr;
      closeEditor();
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to archive');
    } finally {
      setSaving(false);
    }
  }, [userId, supabase, closeEditor, fetchData]);

  /* ─── Editor panel (shared by new + edit) ─── */
  const editorPanel = (existingForPicker: Habit[], onArchive?: () => void) => (
    <motion.div
      className="space-y-4 pt-3"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease }}
    >
      <div>
        <label
          className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted mb-1.5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Name
        </label>
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Fitness"
          autoFocus
          className="w-full rounded-[12px] border border-line bg-page px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      <div>
        <label
          className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted mb-1.5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Colour
        </label>
        <HabitColorPicker
          value={draftColor}
          onChange={setDraftColor}
          existingHabits={existingForPicker}
        />
      </div>

      {error && (
        <p className="text-[12px] text-danger" style={{ fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-press disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={closeEditor}
            disabled={saving}
            className="rounded-[10px] border border-line px-4 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Cancel
          </button>
        </div>
        {onArchive && (
          <button
            type="button"
            onClick={onArchive}
            disabled={saving}
            className="text-[13px] font-medium text-danger transition-colors hover:text-danger/80 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Archive
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      className="flex flex-col items-center px-4 py-12"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease }}
    >
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1">
          <span
            className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            § Habits
          </span>
          <h1
            className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            All habits
          </h1>
        </header>
        <div className="h-px w-full bg-line" />

        {/* ─── New habit button / inline new editor ─── */}
        {editing === 'new' ? (
          <div className="liquid-card rounded-[20px] p-4">
            <p
              className="text-[15px] font-semibold text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              New habit
            </p>
            {editorPanel(rows.map((r) => r.habit))}
          </div>
        ) : (
          <button
            type="button"
            onClick={openNew}
            className="liquid-card flex w-full items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-[14px] font-semibold text-accent transition-transform active:scale-[0.99]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span className="text-[18px] leading-none">+</span>
            New habit
          </button>
        )}

        {/* ─── Habit list ─── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="liquid-card h-[64px] rounded-[20px] animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 && editing !== 'new' ? (
          <div className="liquid-card rounded-[20px] p-8 text-center">
            <p className="text-[15px] font-medium text-ink" style={{ fontFamily: 'var(--font-body)' }}>
              No habits yet
            </p>
            <p className="mt-1 text-[13px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
              Habits group your quests by colour. Add one above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const isOpen = editing === row.habit.id;
              return (
                <div
                  key={row.habit.id}
                  className="liquid-card rounded-[20px] p-4"
                  style={{ ['--tint' as string]: row.habit.color }}
                >
                  <button
                    type="button"
                    onClick={() => (isOpen ? closeEditor() : openEdit(row))}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-full"
                      style={{
                        backgroundColor: row.habit.color,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 8px -2px color-mix(in srgb, var(--tint) 60%, transparent)',
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[15px] font-semibold text-ink"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {row.habit.name}
                      </p>
                      <p
                        className="text-[12px] text-ink-muted tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {row.questCount} {row.questCount === 1 ? 'quest' : 'quests'}
                        {row.bestStreak > 0 ? ` · best ${row.bestStreak}d 🔥` : ''}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-[18px] text-ink-muted transition-transform"
                      style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                      aria-hidden
                    >
                      {isOpen ? '×' : '›'}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen &&
                      editorPanel(
                        rows.filter((r) => r.habit.id !== row.habit.id).map((r) => r.habit),
                        () => handleArchive(row),
                      )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import HabitColorPicker, { isValidHexColor } from '@/components/HabitColorPicker';
import { periodKeyFor } from '@/lib/domain';
import type { Habit, Cadence, Weekday } from '@/lib/types';

/* ─── Motion tokens (docs/03 §5) ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Weekday constants — sorted mon→sun (docs/02 contract) ─── */
const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const CADENCE_OPTIONS: { key: Cadence; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

/* ─── Validation helpers (S4 — server-side input validation) ─── */

function validateHexColor(color: string): string | null {
  if (!isValidHexColor(color)) return 'Invalid colour format (use #RRGGBB)';
  return null;
}

function validateHours(hours: number): string | null {
  if (typeof hours !== 'number' || isNaN(hours)) return 'Hours must be a number';
  if (hours < 0 || hours > 24) return 'Hours must be between 0 and 24';
  if (!Number.isFinite(hours)) return 'Hours must be finite';
  // Allow one decimal place
  const rounded = Math.round(hours * 10) / 10;
  if (Math.abs(hours - rounded) > 0.01) return 'Hours must have at most one decimal place';
  return null;
}

function validateTargetCount(count: number): string | null {
  if (!Number.isInteger(count) || count < 1) return 'Target count must be a positive integer';
  if (count > 9999) return 'Target count seems too high (max 9999)';
  return null;
}

function validateWeekdayEnum(wd: string): string | null {
  const valid: string[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return valid.includes(wd) ? null : `Invalid weekday "${wd}"`;
}

/* ─── Tab type ─── */

type AddTab = 'habit' | 'quest' | 'sleep';

/* ─── Main AddSheet ─── */

export default function AddSheet() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<AddTab>('habit');
  const [userId, setUserId] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ─── Habit form ─── */
  const [habitName, setHabitName] = useState('');
  const [habitColor, setHabitColor] = useState('#E8743B');

  /* ─── Quest form ─── */
  const [questHabitId, setQuestHabitId] = useState<string>('');
  const [questTitle, setQuestTitle] = useState('');
  const [questCadence, setQuestCadence] = useState<Cadence>('daily');
  const [questTarget, setQuestTarget] = useState('1');
  const [questUnit, setQuestUnit] = useState('');
  const [questWeekdays, setQuestWeekdays] = useState<Weekday[]>([]);
  const [questCalendar, setQuestCalendar] = useState(false);

  /* ─── Sleep form ─── */
  const [sleepHours, setSleepHours] = useState('');
  const sleepNightOf = (() => {
    // Previous night by default
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  /* ─── Initialise: get user + habits ─── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: habitsData } = await supabase
          .from('habit')
          .select('*')
          .eq('user_id', user.id)
          .eq('archived', false)
          .order('sort_order', { ascending: true });
        if (habitsData) {
          setHabits(habitsData as unknown as Habit[]);
          // Auto-select the first habit for quest form
          if (habitsData.length > 0) {
            setQuestHabitId(habitsData[0].id);
          }
        }
      }
    };
    init();
  }, [supabase]);

  /* ─── Clear feedback ─── */
  const clearFeedback = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  /* ─── Refresh habits list ─── */
  const refreshHabits = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('habit')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('sort_order', { ascending: true });
    if (data) {
      setHabits(data as unknown as Habit[]);
    }
  }, [userId, supabase]);

  /* ═══════════════════════════════════════════
     NEW HABIT
     ═══════════════════════════════════════════ */
  const handleCreateHabit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    /* Client-side validation (S4) */
    const nameTrimmed = habitName.trim();
    if (!nameTrimmed) {
      setError('Habit name is required');
      return;
    }
    if (nameTrimmed.length > 100) {
      setError('Habit name must be 100 characters or fewer');
      return;
    }
    const colorErr = validateHexColor(habitColor);
    if (colorErr) { setError(colorErr); return; }

    setLoading(true);
    try {
      const { error: insertErr } = await supabase.from('habit').insert({
        name: nameTrimmed,
        color: habitColor,
      });
      if (insertErr) throw insertErr;

      setSuccess(`Habit "${nameTrimmed}" created`);
      setHabitName('');
      setHabitColor('#E8743B');
      await refreshHabits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create habit');
    } finally {
      setLoading(false);
    }
  }, [habitName, habitColor, supabase, clearFeedback, refreshHabits]);

  /* ═══════════════════════════════════════════
     NEW QUEST
     ═══════════════════════════════════════════ */
  const handleCreateQuest = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    /* Client-side validation (S4) */
    const titleTrimmed = questTitle.trim();
    if (!titleTrimmed) {
      setError('Quest title is required');
      return;
    }
    if (titleTrimmed.length > 200) {
      setError('Quest title must be 200 characters or fewer');
      return;
    }
    if (!questHabitId) {
      setError('Please select a habit');
      return;
    }
    const target = parseInt(questTarget, 10);
    const targetErr = validateTargetCount(target);
    if (targetErr) { setError(targetErr); return; }

    const weekdaysSorted = [...questWeekdays].sort((a, b) => {
      const idx: Record<string, number> = { mon:0, tue:1, wed:2, thu:3, fri:4, sat:5, sun:6 };
      return (idx[a] ?? 0) - (idx[b] ?? 0);
    });

    /* Validate weekday enums */
    for (const wd of weekdaysSorted) {
      const wdErr = validateWeekdayEnum(wd);
      if (wdErr) { setError(wdErr); return; }
    }

    setLoading(true);
    try {
      const { data: questData, error: insertErr } = await supabase
        .from('quest')
        .insert({
          habit_id: questHabitId,
          title: titleTrimmed,
          cadence: questCadence,
          target_count: target,
          unit: questUnit.trim() || null,
          weekdays: weekdaysSorted,
          calendar_sync: questCalendar,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      if (!questData) throw new Error('No quest data returned');

      const newQuestId = questData.id;

      /* ─── If weekly+weekdays → generate child quests ─── */
      if (questCadence === 'weekly' && weekdaysSorted.length > 0) {
        const { error: childErr } = await supabase
          .rpc('generate_child_quests', { p_quest_id: newQuestId });
        if (childErr) {
          console.error('generate_child_quests failed:', childErr);
          // Don't block the success — the quest was already created
        }

        /* Ensure instances for today so children appear immediately */
        const today = periodKeyFor('daily');
        const { error: ensureErr } = await supabase
          .rpc('ensure_instances', { p_date: today });
        if (ensureErr) {
          console.error('ensure_instances after quest create failed:', ensureErr);
        }
      }

      /* Also ensure instances for non-weekly quests */
      if (!(questCadence === 'weekly' && weekdaysSorted.length > 0)) {
        const today = periodKeyFor('daily');
        await supabase.rpc('ensure_instances', { p_date: today }).catch(console.error);
      }

      setSuccess(`Quest "${titleTrimmed}" created`);
      /* Reset quest form */
      setQuestTitle('');
      setQuestCadence('daily');
      setQuestTarget('1');
      setQuestUnit('');
      setQuestWeekdays([]);
      setQuestCalendar(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create quest');
    } finally {
      setLoading(false);
    }
  }, [questTitle, questHabitId, questCadence, questTarget, questUnit, questWeekdays, questCalendar, supabase, clearFeedback]);

  /* ═══════════════════════════════════════════
     LOG SLEEP
     ═══════════════════════════════════════════ */
  const handleLogSleep = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const hours = parseFloat(sleepHours);
    const hoursErr = validateHours(hours);
    if (hoursErr) { setError(hoursErr); return; }

    setLoading(true);
    try {
      const { error: rpcErr } = await supabase
        .rpc('log_sleep', { p_night_of: sleepNightOf, p_hours: hours });
      if (rpcErr) throw rpcErr;

      setSuccess(`Logged ${hours}h sleep for ${sleepNightOf}`);
      setSleepHours('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to log sleep');
    } finally {
      setLoading(false);
    }
  }, [sleepHours, sleepNightOf, supabase, clearFeedback]);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  const tabs: { key: AddTab; label: string }[] = [
    { key: 'habit', label: 'New Habit' },
    { key: 'quest', label: 'New Quest' },
    { key: 'sleep', label: 'Log Sleep' },
  ];

  return (
    <motion.div
      className="w-full max-w-md mx-auto space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
    >
      {/* ─── Segmented tabs ─── */}
      <div className="flex rounded-[12px] border border-line bg-surface p-1 overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); clearFeedback(); }}
            className={`
              flex-1 py-2 px-3 text-[13px] font-medium rounded-[10px] transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
              ${
                activeTab === tab.key
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }
            `}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Error / Success feedback ─── */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            className={`rounded-[12px] px-4 py-3 ${
              error
                ? 'bg-danger/10 border border-danger/30 text-danger'
                : 'bg-success/10 border border-success/30 text-success'
            }`}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2, ease }}
          >
            <p className="text-[13px] font-medium leading-[1.4]" style={{ fontFamily: 'var(--font-body)' }}>
              {error ?? success}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          TAB 1: NEW HABIT
          ═══════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'habit' && (
          <motion.form
            key="habit-form"
            onSubmit={handleCreateHabit}
            className="space-y-5"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18, ease }}
          >
            {/* Habit name */}
            <div className="space-y-2">
              <label
                className="block text-[13px] font-medium text-ink-muted"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Name
              </label>
              <input
                type="text"
                value={habitName}
                onChange={(e) => { setHabitName(e.target.value); clearFeedback(); }}
                placeholder="e.g. Morning run, Read daily"
                maxLength={100}
                required
                className="
                  w-full rounded-[12px] border border-line bg-surface px-4 py-3
                  text-[15px] text-ink placeholder:text-ink-disabled
                  focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
                  transition-shadow duration-150
                "
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Colour picker */}
            <div className="space-y-2">
              <label
                className="block text-[13px] font-medium text-ink-muted"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Colour
              </label>
              <HabitColorPicker
                value={habitColor}
                onChange={setHabitColor}
                existingHabits={habits}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full rounded-[12px] bg-accent py-3 text-[15px] font-semibold text-white
                hover:bg-accent-press active:scale-[0.98] transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
              "
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {loading ? 'Creating…' : 'Create Habit'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          TAB 2: NEW QUEST
          ═══════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'quest' && (
          <motion.form
            key="quest-form"
            onSubmit={handleCreateQuest}
            className="space-y-5"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18, ease }}
          >
            {/* Habit selector */}
            <div className="space-y-2">
              <label
                className="block text-[13px] font-medium text-ink-muted"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Habit
              </label>
              {habits.length === 0 ? (
                <p className="text-[13px] text-ink-muted italic" style={{ fontFamily: 'var(--font-body)' }}>
                  Create a habit first in the New Habit tab
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {habits.map((habit) => {
                    const selected = questHabitId === habit.id;
                    return (
                      <button
                        key={habit.id}
                        type="button"
                        onClick={() => setQuestHabitId(habit.id)}
                        className={`
                          flex items-center gap-2 rounded-[12px] border px-3.5 py-2.5
                          text-[13px] font-medium transition-all duration-150
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                          ${selected
                            ? 'border-accent bg-accent/5 text-ink shadow-sm'
                            : 'border-line bg-surface text-ink-muted hover:text-ink hover:border-ink-muted'
                          }
                        `}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: habit.color }}
                        />
                        {habit.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quest title */}
            <div className="space-y-2">
              <label
                className="block text-[13px] font-medium text-ink-muted"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Title
              </label>
              <input
                type="text"
                value={questTitle}
                onChange={(e) => { setQuestTitle(e.target.value); clearFeedback(); }}
                placeholder="e.g. Morning run"
                maxLength={200}
                required
                className="
                  w-full rounded-[12px] border border-line bg-surface px-4 py-3
                  text-[15px] text-ink placeholder:text-ink-disabled
                  focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
                  transition-shadow duration-150
                "
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Cadence */}
            <div className="space-y-2">
              <label
                className="block text-[13px] font-medium text-ink-muted"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Cadence
              </label>
              <div className="flex flex-wrap gap-2">
                {CADENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setQuestCadence(opt.key)}
                    className={`
                      rounded-[12px] border px-3.5 py-2 text-[13px] font-medium transition-all duration-150
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                      ${questCadence === opt.key
                        ? 'border-accent bg-accent/5 text-ink shadow-sm'
                        : 'border-line bg-surface text-ink-muted hover:text-ink hover:border-ink-muted'
                      }
                    `}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target count + unit */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <label
                  className="block text-[13px] font-medium text-ink-muted"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Target
                </label>
                <input
                  type="number"
                  value={questTarget}
                  onChange={(e) => setQuestTarget(e.target.value)}
                  min={1}
                  max={9999}
                  required
                  className="
                    w-full rounded-[12px] border border-line bg-surface px-4 py-3
                    text-[15px] text-ink placeholder:text-ink-disabled
                    focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
                    transition-shadow duration-150
                  "
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div className="flex-1 space-y-2">
                <label
                  className="block text-[13px] font-medium text-ink-muted"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Unit (optional)
                </label>
                <input
                  type="text"
                  value={questUnit}
                  onChange={(e) => setQuestUnit(e.target.value)}
                  placeholder="km, pages, min…"
                  maxLength={50}
                  className="
                    w-full rounded-[12px] border border-line bg-surface px-4 py-3
                    text-[15px] text-ink placeholder:text-ink-disabled
                    focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
                    transition-shadow duration-150
                  "
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>
            </div>

            {/* Weekdays — only relevant for weekly+ cadences */}
            <AnimatePresence>
              {(questCadence === 'weekly' || questCadence === 'monthly' || questCadence === 'yearly') && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease }}
                >
                  <label
                    className="block text-[13px] font-medium text-ink-muted"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Weekdays (optional — generates daily children)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((wd) => {
                      const isSelected = questWeekdays.includes(wd.key);
                      return (
                        <button
                          key={wd.key}
                          type="button"
                          onClick={() => {
                            setQuestWeekdays((prev) =>
                              isSelected
                                ? prev.filter((w) => w !== wd.key)
                                : [...prev, wd.key].sort((a, b) => {
                                    const idx: Record<string, number> = { mon:0, tue:1, wed:2, thu:3, fri:4, sat:5, sun:6 };
                                    return (idx[a] ?? 0) - (idx[b] ?? 0);
                                  })
                            );
                            clearFeedback();
                          }}
                          className={`
                            h-9 min-w-[40px] rounded-[10px] border text-[12px] font-semibold transition-all duration-150
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                            ${isSelected
                              ? 'border-accent bg-accent text-white shadow-sm'
                              : 'border-line bg-surface text-ink-muted hover:text-ink hover:border-ink-muted'
                            }
                          `}
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                  {questWeekdays.length > 0 && (
                    <p className="text-[11px] text-ink-muted mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                      {questCadence === 'weekly'
                        ? 'Daily child quests will be auto-created for selected days.'
                        : 'Daily child quests will be created for each selected weekday.'}
                      {' '}Children appear on the home screen on their matching days.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Calendar sync toggle */}
            <div className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-4 py-3">
              <div>
                <label
                  className="text-[13px] font-medium text-ink"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Calendar sync
                </label>
                <p className="text-[11px] text-ink-muted mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  Sync to Google Calendar (requires setup)
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={questCalendar}
                onClick={() => setQuestCalendar(!questCalendar)}
                className={`
                  relative h-6 w-11 rounded-full transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                  ${questCalendar ? 'bg-accent' : 'bg-line'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm
                    transition-transform duration-200
                    ${questCalendar ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || habits.length === 0}
              className="
                w-full rounded-[12px] bg-accent py-3 text-[15px] font-semibold text-white
                hover:bg-accent-press active:scale-[0.98] transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
              "
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {loading ? 'Creating…' : habits.length === 0 ? 'Create a Habit First' : 'Create Quest'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          TAB 3: LOG SLEEP
          ═══════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'sleep' && (
          <motion.form
            key="sleep-form"
            onSubmit={handleLogSleep}
            className="space-y-5"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18, ease }}
          >
            {/* Night of (readonly) */}
            <div className="space-y-2">
              <label
                className="block text-[13px] font-medium text-ink-muted"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Night of
              </label>
              <div className="w-full rounded-[12px] border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                {sleepNightOf}
              </div>
              <p className="text-[11px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
                Logging sleep for the previous night. Only one entry per night (upserts).
              </p>
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <label
                className="block text-[13px] font-medium text-ink-muted"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Hours slept
              </label>
              <input
                type="number"
                value={sleepHours}
                onChange={(e) => { setSleepHours(e.target.value); clearFeedback(); }}
                placeholder="e.g. 7.5"
                step="0.1"
                min={0}
                max={24}
                required
                className="
                  w-full rounded-[12px] border border-line bg-surface px-4 py-3
                  text-[15px] text-ink placeholder:text-ink-disabled
                  focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
                  transition-shadow duration-150
                "
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full rounded-[12px] bg-accent py-3 text-[15px] font-semibold text-white
                hover:bg-accent-press active:scale-[0.98] transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
              "
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {loading ? 'Logging…' : 'Log Sleep'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

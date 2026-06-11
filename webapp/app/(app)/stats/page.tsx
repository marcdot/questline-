'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { periodKeyFor, getISOWeek, mondayOfISOWeek } from '@/lib/domain';
import XpChart, { type XpDataPoint } from '@/components/XpChart';
import StreakDisplay, { type StreakEntry } from '@/components/StreakDisplay';
import StatusGrid, { type StatusEntry, type StatusItem } from '@/components/StatusGrid';
import SleepHeatmap, { type SleepDay } from '@/components/SleepHeatmap';
import type { Habit } from '@/lib/types';

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Period filter types ─── */

type PeriodFilter = 'day' | 'week' | 'month' | 'year';

const PERIOD_FILTERS: PeriodFilter[] = ['day', 'week', 'month', 'year'];

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
};

/* ─── Helpers ─── */

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getISODateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getWeekLabel(weekKey: string): string {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/i);
  if (!match) return weekKey;
  return `W${match[2]}`;
}

/* ─── Period range generators ─── */

function getPeriodRange(filter: PeriodFilter): string[] {
  const now = new Date();
  const keys: string[] = [];

  switch (filter) {
    case 'day': {
      // Last 14 days
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        keys.push(periodKeyFor('daily', d));
      }
      break;
    }
    case 'week': {
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        keys.push(periodKeyFor('weekly', d));
      }
      // Deduplicate (if within same ISO week)
      const unique = [...new Set(keys)];
      return unique.slice(0, 12);
    }
    case 'month': {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        keys.push(periodKeyFor('monthly', d));
      }
      break;
    }
    case 'year': {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        keys.push(String(now.getFullYear() - i));
      }
      break;
    }
  }

  return keys;
}

function xpPeriodKey(createdAt: string, filter: PeriodFilter): string {
  const d = new Date(createdAt);
  switch (filter) {
    case 'day':
      return periodKeyFor('daily', d);
    case 'week':
      return periodKeyFor('weekly', d);
    case 'month':
      return periodKeyFor('monthly', d);
    case 'year':
      return periodKeyFor('yearly', d);
  }
}

function getPeriodLabel(key: string, filter: PeriodFilter): string {
  switch (filter) {
    case 'day':
      return getISODateLabel(key);
    case 'week':
      return getWeekLabel(key);
    case 'month':
      return getMonthLabel(key);
    case 'year':
      return key;
  }
}

/**
 * Map a daily period_key (YYYY-MM-DD) to the current filter's period format.
 * Used to re-bin daily quest_instance rows into weekly/monthly/yearly buckets.
 */
function dailyKeyToPeriodKey(dailyKey: string, filter: PeriodFilter): string {
  switch (filter) {
    case 'day':
      return dailyKey;
    case 'week': {
      const d = new Date(dailyKey + 'T12:00:00');
      const { weekYear, weekNumber } = getISOWeek(d);
      return `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;
    }
    case 'month':
      return dailyKey.substring(0, 7); // YYYY-MM
    case 'year':
      return dailyKey.substring(0, 4); // YYYY
  }
}

/* ─── Sleep data helpers ─── */

function buildSleepWeeks(
  sleepMap: Map<string, number>,
  numDays: number = 84,
): SleepDay[][] {
  const now = new Date();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Build a flat array of the last `numDays` days
  const days: SleepDay[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateLocal(d);
    const hours = sleepMap.get(dateStr) ?? 0;
    days.push({
      date: dateStr,
      dayLabel: dayLabels[d.getDay()],
      hours,
      hasData: sleepMap.has(dateStr),
    });
  }

  // Group into weeks (Mon-Sun)
  // Find the first Monday
  const weeks: SleepDay[][] = [];
  let currentWeek: SleepDay[] = [];

  for (const day of days) {
    const d = new Date(day.date + 'T12:00:00');
    const dow = d.getDay(); // 0=Sun
    // Start new week on Monday (or the first day)
    if (dow === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

/* ─── Raw Supabase shapes (matching page.tsx pattern) ─── */

interface RawXpEvent {
  amount: number;
  created_at: string;
}

interface RawQuest {
  id: string;
  user_id: string;
  habit_id: string | null;
  title: string;
  cadence: string;
  target_count: number;
  unit: string | null;
  weekdays: string[];
  generated_parent_id: string | null;
  calendar_sync: boolean;
  reminder_time: string | null;
  active_from: string;
  active_to: string | null;
  archived: boolean;
  created_at: string;
}

interface RawInstance {
  id: string;
  quest_id: string;
  period_key: string;
  progress: number;
  target_count: number;
  completed: boolean;
  completed_at: string | null;
  quest: RawQuest | null;
}

interface RawStreak {
  id: string;
  quest_id: string;
  current: number;
  longest: number;
  last_period_key: string | null;
}

interface RawSleepLog {
  night_of: string;
  hours: number;
}

/* ─── Stats page ─── */

export default function StatsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [habitFilter, setHabitFilter] = useState<string | null>(null);

  // Data
  const [habits, setHabits] = useState<Habit[]>([]);
  const [xpData, setXpData] = useState<XpDataPoint[]>([]);
  const [streakEntries, setStreakEntries] = useState<StreakEntry[]>([]);
  const [statusData, setStatusData] = useState<StatusEntry[]>([]);
  const [sleepWeeks, setSleepWeeks] = useState<SleepDay[][]>([]);

  /* ─── Initialize: get user ─── */
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ id: authUser.id });
      }
    };
    init();
  }, [supabase]);

  /* ─── Fetch stats data ─── */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch all habits for filter
      const { data: rawHabits } = await supabase
        .from('habit')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('sort_order', { ascending: true });

      const allHabits = (rawHabits ?? []) as unknown as Habit[];
      setHabits(allHabits);

      // 2. Fetch all quests (for mapping habit_id to quests)
      const { data: rawQuests } = await supabase
        .from('quest')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false);

      const allQuests = (rawQuests ?? []) as unknown as RawQuest[];

      // Build quest → habit mapping
      const questHabitMap = new Map<string, string | null>();
      const questNameMap = new Map<string, string>();
      for (const q of allQuests) {
        questHabitMap.set(q.id, q.habit_id);
        questNameMap.set(q.id, q.title);
      }

      // 3. Determine period range
      const periodKeys = getPeriodRange(periodFilter);

      // 4. Fetch XP events in the period range
      // For XP events, we need events whose created_at falls within the range
      const startDate = periodKeys[0];
      const endDate = periodKeys[periodKeys.length - 1];

      let startDateStr: string;
      let endDateStr: string;

      switch (periodFilter) {
        case 'day':
          startDateStr = startDate + 'T00:00:00Z';
          endDateStr = endDate + 'T23:59:59Z';
          break;
        case 'week': {
          const match = startDate.match(/^(\d{4})-W(\d{2})$/i);
          if (match) {
            // Approximate start — fetch all and filter client-side
            startDateStr = new Date(Date.UTC(parseInt(match[1]), 0, 1)).toISOString();
          } else {
            startDateStr = new Date(0).toISOString();
          }
          endDateStr = new Date().toISOString();
          break;
        }
        case 'month':
          startDateStr = startDate + '-01T00:00:00Z';
          endDateStr = new Date().toISOString();
          break;
        case 'year':
          startDateStr = startDate + '-01-01T00:00:00Z';
          endDateStr = new Date().toISOString();
          break;
      }

      const { data: rawXpEvents } = await supabase
        .from('xp_event')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: true });

      const xpEvents = (rawXpEvents ?? []) as RawXpEvent[];

      // Group XP by period key, respecting habit filter
      const xpByPeriod = new Map<string, number>();
      for (const event of xpEvents) {
        const pk = xpPeriodKey(event.created_at, periodFilter);
        xpByPeriod.set(pk, (xpByPeriod.get(pk) ?? 0) + event.amount);
      }

      // Build XP chart data
      const xpChartData: XpDataPoint[] = periodKeys.map((pk) => ({
        label: getPeriodLabel(pk, periodFilter),
        sortKey: pk,
        xp: xpByPeriod.get(pk) ?? 0,
      }));
      setXpData(xpChartData);

      // 5. Fetch streaks for all quests
      const questIds = allQuests.map((q) => q.id);
      const { data: rawStreaks } = await supabase
        .from('streak')
        .select('*')
        .in('quest_id', questIds);

      const streakRows = (rawStreaks ?? []) as RawStreak[];

      // Compute per-habit longest streak
      const habitStreakMap = new Map<string, { longest: number; current: number; bestQuest: string }>();

      for (const s of streakRows) {
        const habitId = questHabitMap.get(s.quest_id) ?? 'none';
        const questName = questNameMap.get(s.quest_id) ?? 'Unknown';
        const existing = habitStreakMap.get(habitId);
        if (!existing || s.longest > existing.longest) {
          habitStreakMap.set(habitId, {
            longest: s.longest,
            current: s.current,
            bestQuest: questName,
          });
        }
      }

      const habitMap = new Map(allHabits.map((h) => [h.id, h]));

      const entries: StreakEntry[] = [];
      for (const [habitId, streakInfo] of habitStreakMap) {
        if (habitId === 'none') continue;
        const habit = habitMap.get(habitId);
        if (!habit) continue;
        // Apply habit filter
        if (habitFilter && habit.id !== habitFilter) continue;
        entries.push({
          habitId: habit.id,
          habitName: habit.name,
          habitColor: habit.color,
          longest: streakInfo.longest,
          current: streakInfo.current,
          bestQuestName: streakInfo.bestQuest,
        });
      }
      setStreakEntries(entries);

      // 6. Fetch quest_instances for status grid
      // When period filter is not 'day', instances have daily period_keys that must
      // be re-binned into weekly/monthly/yearly buckets.
      let rawInstances: RawInstance[] | null = null;

      if (periodFilter === 'day') {
        // Daily: period_keys already match daily format, direct IN filter works
        const { data } = await supabase
          .from('quest_instance')
          .select('*, quest:quest_id(*)')
          .eq('user_id', user.id)
          .in('period_key', periodKeys)
          .order('period_key', { ascending: true });
        rawInstances = data as unknown as RawInstance[];
      } else {
        // Compute date range covering all period columns so we can fetch
        // instances by their daily period_key, then re-bin below.
        let instanceStart: string;
        let instanceEnd: string;

        if (periodFilter === 'week') {
          const firstMatch = periodKeys[0].match(/^(\d{4})-W(\d{2})$/i);
          const lastMatch = periodKeys[periodKeys.length - 1].match(/^(\d{4})-W(\d{2})$/i);
          if (firstMatch && lastMatch) {
            const firstMonday = mondayOfISOWeek(parseInt(firstMatch[1]), parseInt(firstMatch[2]));
            instanceStart = formatDateLocal(firstMonday);
            const lastMonday = mondayOfISOWeek(parseInt(lastMatch[1]), parseInt(lastMatch[2]));
            const lastSunday = new Date(lastMonday);
            lastSunday.setDate(lastSunday.getDate() + 6);
            instanceEnd = formatDateLocal(lastSunday);
          } else {
            instanceStart = periodKeys[0];
            instanceEnd = periodKeys[periodKeys.length - 1];
          }
        } else if (periodFilter === 'month') {
          instanceStart = periodKeys[0] + '-01';
          const [y, m] = periodKeys[periodKeys.length - 1].split('-').map(Number);
          const lastDay = new Date(y, m, 0).getDate();
          instanceEnd = periodKeys[periodKeys.length - 1] + '-' + String(lastDay).padStart(2, '0');
        } else { // year
          instanceStart = periodKeys[0] + '-01-01';
          instanceEnd = periodKeys[periodKeys.length - 1] + '-12-31';
        }

        const { data } = await supabase
          .from('quest_instance')
          .select('*, quest:quest_id(*)')
          .eq('user_id', user.id)
          .gte('period_key', instanceStart)
          .lte('period_key', instanceEnd)
          .order('period_key', { ascending: true });
        rawInstances = data as unknown as RawInstance[];
      }

      const instances = (rawInstances ?? []) as unknown as RawInstance[];

      // Group instances by mapped period key (re-bin daily keys into filter periods)
      const instancesByPeriod = new Map<string, RawInstance[]>();
      for (const inst of instances) {
        if (habitFilter) {
          const qHabitId = questHabitMap.get(inst.quest_id);
          if (qHabitId !== habitFilter) continue;
        }
        const mappedKey = periodFilter === 'day'
          ? inst.period_key
          : dailyKeyToPeriodKey(inst.period_key, periodFilter);
        const arr = instancesByPeriod.get(mappedKey);
        if (!arr) {
          instancesByPeriod.set(mappedKey, [inst]);
        } else {
          arr.push(inst);
        }
      }

      const statusEntries: StatusEntry[] = periodKeys.map((pk) => {
        const periodInstances = instancesByPeriod.get(pk) ?? [];
        const items: StatusItem[] = periodInstances.map((inst) => {
          const qId = inst.quest_id;
          const qName = questNameMap.get(qId) ?? 'Unknown';
          const qHabitId = questHabitMap.get(qId);
          const habit = qHabitId ? habitMap.get(qHabitId) : null;
          return {
            questId: inst.id,
            questTitle: qName,
            habitName: habit?.name ?? '',
            habitColor: habit?.color ?? '#8A8F98',
            completed: inst.completed,
            progress: inst.progress,
            target: inst.target_count,
          };
        });
        return {
          periodKey: pk,
          label: getPeriodLabel(pk, periodFilter),
          items,
        };
      });
      setStatusData(statusEntries);

      // 7. Fetch sleep data (last 12 weeks = ~84 days for heatmap)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { data: rawSleepLogs } = await supabase
        .from('sleep_log')
        .select('night_of, hours')
        .eq('user_id', user.id)
        .gte('night_of', formatDateLocal(ninetyDaysAgo))
        .order('night_of', { ascending: true });

      const sleepRows = (rawSleepLogs ?? []) as RawSleepLog[];
      const sleepMap = new Map<string, number>();
      for (const s of sleepRows) {
        sleepMap.set(s.night_of, s.hours);
      }

      const weeks = buildSleepWeeks(sleepMap, 84);
      setSleepWeeks(weeks);
    } catch (err) {
      console.error('Failed to fetch stats data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, periodFilter, habitFilter, supabase]);

  /* ─── Fetch on user/filter change ─── */
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [user, fetchData]);

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <motion.main
        className="flex min-h-screen flex-col items-center px-4 py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease }}
      >
        <div className="w-full max-w-md space-y-6">
          {/* Skeleton filters */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-16 rounded-full bg-line/40 animate-pulse" />
            ))}
          </div>
          {/* Skeleton chart */}
          <div className="h-[160px] rounded-[12px] bg-surface border border-line animate-pulse" />
          {/* Skeleton streaks */}
          <div className="h-[60px] rounded-[12px] bg-surface border border-line animate-pulse" />
        </div>
      </motion.main>
    );
  }

  /* ─── Main render ─── */
  return (
    <motion.main
      className="flex min-h-screen flex-col items-center px-4 py-12"
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
            § Stats
          </span>
          <h1
            className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Statistics
          </h1>
        </header>
        <div className="h-px w-full bg-line" />
        <div className="h-px w-full bg-line" />

        {/* ─── Period filter pills ─── */}
        <div className="flex gap-2 flex-wrap">
          {PERIOD_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setPeriodFilter(f)}
              className={[
                'px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors',
                'border',
                periodFilter === f
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-ink-muted border-line hover:border-accent/50 hover:text-ink',
              ].join(' ')}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* ─── Habit filter ─── */}
        <div>
          <select
            value={habitFilter ?? ''}
            onChange={(e) => setHabitFilter(e.target.value || null)}
            className={[
              'w-full rounded-[12px] border border-line bg-surface px-3 py-2.5',
              'text-[14px] text-ink appearance-none',
              'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
            ].join(' ')}
            style={{
              fontFamily: 'var(--font-body)',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23726e66' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '32px',
            }}
          >
            <option value="">All habits</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* ─── XP Chart ─── */}
        <section className="space-y-2">
          <h2
            className="text-[15px] font-semibold text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            XP Over Time
          </h2>
          <XpChart data={xpData} periodLabel={PERIOD_LABELS[periodFilter]} />
        </section>

        {/* ─── Streaks ─── */}
        <section className="space-y-2">
          <h2
            className="text-[15px] font-semibold text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Streaks by Habit
          </h2>
          <StreakDisplay streaks={streakEntries} mode="daily" />
        </section>

        {/* ─── Status Grid ─── */}
        <section className="space-y-2">
          <h2
            className="text-[15px] font-semibold text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quest Status
          </h2>
          <StatusGrid
            data={statusData}
            periodLabel={PERIOD_LABELS[periodFilter]}
          />
        </section>

        {/* ─── Sleep Heatmap ─── */}
        <section className="space-y-2">
          <h2
            className="text-[15px] font-semibold text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Sleep
          </h2>
          <SleepHeatmap weeks={sleepWeeks} />
        </section>
      </div>
    </motion.main>
  );
}

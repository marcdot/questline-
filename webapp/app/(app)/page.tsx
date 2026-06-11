'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { periodKeyFor } from '@/lib/domain';
import { enqueueEvent, flushQueue, setupAutoFlush } from '@/lib/sync/offline-queue';
import QuestCard from '@/components/QuestCard';
import MiniDashboard from '@/components/MiniDashboard';
import type {
  QuestInstance,
  Quest,
  Habit,
  Cadence,
  Weekday,
  Streak,
} from '@/lib/types';

/* ─── Types for joined data ─── */

interface QuestWithHabit {
  instance: QuestInstance;
  quest: Quest;
  habit: Habit | null;
  streak: Streak | null;
}

interface HomeData {
  quests: QuestWithHabit[];
  totalXp: number;
  todayXp: number;
  todayCompleted: number;
  todayTotal: number;
  maxStreak: number;
  sleepData: Array<{ nightOf: string; hours: number }>;
}

/* ─── Raw Supabase shapes (implicit from joins) ─── */

interface RawInstance {
  id: string;
  user_id: string;
  quest_id: string;
  period_key: string;
  progress: number;
  target_count: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  quest: RawQuestWithHabit | null;
}

interface RawQuestWithHabit {
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
  habit: RawHabit | null;
}

interface RawHabit {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  archived: boolean;
  created_at: string;
}

interface RawStreak {
  id: string;
  user_id: string;
  quest_id: string;
  current: number;
  longest: number;
  last_period_key: string | null;
}

interface RawXpEvent {
  amount: number;
}

interface RawSleepLog {
  night_of: string;
  hours: number;
}

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Format today's date for display ─── */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/* ─── Home page ─── */

export default function Home() {
  const supabase = createClient();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [online, setOnline] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const todayStr = periodKeyFor('daily');

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

  /* ─── Fetch home data ─── */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Ensure instances exist for today
      await supabase.rpc('ensure_instances', { p_date: todayStr });

      // 2. Fetch instances with quest + habit data
      const { data: instances, error: instErr } = await supabase
        .from('quest_instance')
        .select(`
          *,
          quest:quest_id (
            *,
            habit:habit_id (*)
          )
        `)
        .eq('period_key', todayStr)
        .order('created_at', { ascending: true });

      if (instErr) throw instErr;

      const rawInstances = (instances ?? []) as unknown as RawInstance[];

      // 3. Fetch streaks for each quest
      const questIds = [...new Set(rawInstances.map((i: RawInstance) => i.quest_id))];
      const { data: streaks } = await supabase
        .from('streak')
        .select('*')
        .in('quest_id', questIds);

      const rawStreaks = (streaks ?? []) as unknown as RawStreak[];
      const streakMap = new Map(rawStreaks.map((s: RawStreak) => [s.quest_id, s]));

      // 4. Fetch XP total
      const { data: xpEvents } = await supabase
        .from('xp_event')
        .select('amount')
        .eq('user_id', user.id);

      const rawXp = (xpEvents ?? []) as RawXpEvent[];
      const totalXp = rawXp.reduce((sum: number, e: RawXpEvent) => sum + e.amount, 0);

      // 5. Fetch today's XP events
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayXpEvents } = await supabase
        .from('xp_event')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString());

      const rawTodayXp = (todayXpEvents ?? []) as RawXpEvent[];
      const todayXp = rawTodayXp.reduce((sum: number, e: RawXpEvent) => sum + e.amount, 0);

      // 6. Fetch sleep data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: sleepLogs } = await supabase
        .from('sleep_log')
        .select('night_of, hours')
        .eq('user_id', user.id)
        .gte('night_of', thirtyDaysAgo.toISOString().split('T')[0])
        .order('night_of', { ascending: true })
        .limit(30);

      const rawSleep = (sleepLogs ?? []) as RawSleepLog[];

      // 7. Compute dashboard stats
      const questsWithHabit: QuestWithHabit[] = rawInstances.map((inst: RawInstance) => {
        const questData = inst.quest as RawQuestWithHabit | null;
        const q = questData ?? {
          id: '', user_id: '', habit_id: null, title: '', cadence: 'daily',
          target_count: 1, unit: null, weekdays: [], generated_parent_id: null,
          calendar_sync: false, reminder_time: null, active_from: '', active_to: null,
          archived: false, created_at: '',
        };
        const h = questData?.habit as RawHabit | null;
        const s = streakMap.get(inst.quest_id) as RawStreak | undefined;

        return {
          instance: {
            id: inst.id,
            user_id: inst.user_id,
            quest_id: inst.quest_id,
            period_key: inst.period_key,
            progress: inst.progress,
            target_count: inst.target_count,
            completed: inst.completed,
            completed_at: inst.completed_at,
            created_at: inst.created_at,
          },
          quest: {
            id: q.id,
            user_id: q.user_id,
            habit_id: q.habit_id,
            title: q.title,
            cadence: q.cadence as Cadence,
            target_count: q.target_count,
            unit: q.unit,
            weekdays: (q.weekdays ?? []) as Weekday[],
            generated_parent_id: q.generated_parent_id,
            calendar_sync: q.calendar_sync,
            reminder_time: q.reminder_time,
            active_from: q.active_from,
            active_to: q.active_to,
            archived: q.archived,
            created_at: q.created_at,
          },
          habit: h
            ? {
                id: h.id,
                user_id: h.user_id,
                name: h.name,
                color: h.color,
                sort_order: h.sort_order,
                archived: h.archived,
                created_at: h.created_at,
              }
            : null,
          streak: s
            ? {
                id: s.id,
                user_id: s.user_id,
                quest_id: s.quest_id,
                current: s.current,
                longest: s.longest,
                last_period_key: s.last_period_key,
              }
            : null,
        };
      });

      const completedCount = questsWithHabit.filter(
        (q: QuestWithHabit) => q.instance.completed || q.instance.progress >= q.instance.target_count,
      ).length;

      const maxStreak = Math.max(
        ...rawStreaks.map((s: RawStreak) => s.current),
        0,
      );

      setData({
        quests: questsWithHabit,
        totalXp,
        todayXp,
        todayCompleted: completedCount,
        todayTotal: questsWithHabit.length,
        maxStreak,
        sleepData: rawSleep.map((s: RawSleepLog) => ({
          nightOf: s.night_of,
          hours: s.hours,
        })),
      });
    } catch (err) {
      console.error('Failed to fetch home data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr, supabase]);

  /* ─── Fetch on user available ─── */
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [user, fetchData]);

  /* ─── Offline auto-flush ─── */
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);

    if (user) {
      unsubscribeRef.current = setupAutoFlush(user.id);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeRef.current?.();
    };
  }, [user]);

  /* ─── Quiet reconcile: re-pull authoritative XP totals after a server sync.
     The optimistic handlers update progress/streak instantly; XP is granted
     server-side by apply_quest_event, so we re-read it here (no loading flash). */
  const reconcileXp = useCallback(async () => {
    if (!user) return;
    const { data: xpAll } = await supabase
      .from('xp_event').select('amount').eq('user_id', user.id);
    const totalXp = (xpAll ?? []).reduce(
      (sum: number, e: { amount: number }) => sum + e.amount, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: xpToday } = await supabase
      .from('xp_event').select('amount').eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString());
    const todayXp = (xpToday ?? []).reduce(
      (sum: number, e: { amount: number }) => sum + e.amount, 0);
    setData((prev) => (prev ? { ...prev, totalXp, todayXp } : prev));
  }, [user, supabase]);

  /* ─── Handlers for quest interaction ─── */
  const handleIncrement = useCallback(
    async (instanceId: string, delta: number) => {
      if (!user) return;

      // Optimistic UI: update local state immediately
      setData((prev) => {
        if (!prev) return prev;
        const updated = prev.quests.map((q: QuestWithHabit) => {
          if (q.instance.id !== instanceId) return q;

          const newProgress = Math.min(q.instance.progress + delta, q.instance.target_count);
          const nowCompleted = newProgress >= q.instance.target_count && !q.instance.completed;

          return {
            ...q,
            instance: {
              ...q.instance,
              progress: newProgress,
              completed: q.instance.completed || nowCompleted,
            },
            streak: nowCompleted
              ? {
                  id: '',
                  user_id: '',
                  quest_id: q.instance.quest_id,
                  current: (q.streak?.current ?? 0) + 1,
                  longest: Math.max(q.streak?.longest ?? 0, (q.streak?.current ?? 0) + 1),
                  last_period_key: q.instance.period_key,
                }
              : q.streak,
        };
      });

        const completedCount = updated.filter(
          (q: QuestWithHabit) => q.instance.completed || q.instance.progress >= q.instance.target_count,
        ).length;

        return {
          ...prev,
          quests: updated,
          todayCompleted: completedCount,
        };
      });

      // Enqueue event for server sync
      await enqueueEvent(user.id, instanceId, 'increment', delta);

      // Try flushing, then reconcile XP from the server (apply_quest_event grants it)
      if (navigator.onLine) {
        await flushQueue(user.id);
        await reconcileXp();
      }
    },
    [user, reconcileXp],
  );

  const handleComplete = useCallback(
    async (instanceId: string, delta: number) => {
      if (!user) return;

      // Optimistic UI: mark as complete immediately
      setData((prev) => {
        if (!prev) return prev;
        const updated = prev.quests.map((q: QuestWithHabit) => {
          if (q.instance.id !== instanceId) return q;
          return {
            ...q,
            instance: {
              ...q.instance,
              progress: q.instance.target_count,
              completed: true,
            },
            streak: {
              id: '',
              user_id: '',
              quest_id: q.instance.quest_id,
              current: (q.streak?.current ?? 0) + 1,
              longest: Math.max(q.streak?.longest ?? 0, (q.streak?.current ?? 0) + 1),
              last_period_key: q.instance.period_key,
            },
          };
        });

        const completedCount = updated.filter((q: QuestWithHabit) => q.instance.completed).length;
        const maxStreak = Math.max(
          ...updated.map((q: QuestWithHabit) => q.streak?.current ?? 0),
          0,
        );

        return {
          ...prev,
          quests: updated,
          todayCompleted: completedCount,
          maxStreak,
        };
      });

      // Enqueue event
      await enqueueEvent(user.id, instanceId, 'complete', delta);

      // Flush, then reconcile XP from the server
      if (navigator.onLine) {
        await flushQueue(user.id);
        await reconcileXp();
      }
    },
    [user, reconcileXp],
  );

  /* ─── Loading state ─── */
  if (loading || !data) {
    return (
      <motion.main
        className="flex min-h-screen flex-col items-center px-4 py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease }}
      >
        <div className="w-full max-w-md space-y-6">
          {/* Skeleton header */}
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-line/60 animate-pulse" />
            <div className="h-8 w-40 rounded bg-line/40 animate-pulse" />
          </div>
          {/* Skeleton cards */}
          {[1, 2, 3].map((i: number) => (
            <div
              key={i}
              className="h-[72px] rounded-[16px] border border-line bg-surface animate-pulse"
              style={{ animationDelay: `${i * 100}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </motion.main>
    );
  }

  /* ─── Empty state ─── */
  if (data.quests.length === 0) {
    return (
      <motion.main
        className="flex min-h-screen flex-col items-center px-4 py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease }}
      >
        <div className="w-full max-w-md space-y-6">
          <Header userInitial={user?.id?.charAt(0)?.toUpperCase() ?? '?'} />

          <MiniDashboard
            completedToday={0}
            totalToday={0}
            streak={data.maxStreak}
            xpTotal={data.totalXp}
            xpToday={data.todayXp}
            sleepData={data.sleepData}
          />

          <div className="h-px w-full bg-line" />

          <div className="flex flex-col items-center rounded-[16px] border border-line bg-surface p-8 text-center">
            <p
              className="text-[15px] font-medium leading-[1.55] text-ink"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              No quests today
            </p>
            <p
              className="mt-1 text-[13px] leading-[1.4] text-ink-muted"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Tap the <span className="text-accent">+</span> below to create your first quest.
            </p>
          </div>
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
        {/* ─── Header ─── */}
        <Header userInitial={user?.id?.charAt(0)?.toUpperCase() ?? '?'} />

        {/* ─── Offline banner ─── */}
        {!online && (
          <motion.div
            className="rounded-[12px] bg-warning/10 border border-warning/30 px-4 py-2"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[12px] font-medium text-warning text-center" style={{ fontFamily: 'var(--font-body)' }}>
              Offline — taps are queued and will sync when reconnected
            </p>
          </motion.div>
        )}

        {/* ─── Mini Dashboard ─── */}
        <MiniDashboard
          completedToday={data.todayCompleted}
          totalToday={data.todayTotal}
          streak={data.maxStreak}
          xpTotal={data.totalXp}
          xpToday={data.todayXp}
          sleepData={data.sleepData}
        />

        {/* ─── Quests today ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-[17px] font-semibold text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Today
            </h2>
            <span
              className="text-[12px] font-medium text-ink-muted tabular-nums"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {data.todayCompleted}/{data.todayTotal}
            </span>
          </div>

          <div className="space-y-3">
            {data.quests.map((qw: QuestWithHabit) => (
              <QuestCard
                key={qw.instance.id}
                instance={qw.instance}
                quest={qw.quest}
                habit={qw.habit}
                onIncrement={handleIncrement}
                onComplete={handleComplete}
                optimisticXp={
                  qw.instance.completed || qw.instance.progress >= qw.instance.target_count
                    ? 0
                    : undefined
                }
                optimisticStreak={
                  qw.streak?.current ?? 0
                }
              />
            ))}
          </div>
        </div>
      </div>
    </motion.main>
  );
}

/* ─── Header sub-component ─── */

function Header({ userInitial }: { userInitial: string }) {
  return (
    <header className="space-y-1">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          § Questline
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] text-ink-muted"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {formatDate(new Date())}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
            {userInitial}
          </div>
        </div>
      </div>
      <h1
        className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Good{new Date().getHours() < 12 ? ' morning' : new Date().getHours() < 18 ? ' afternoon' : ' evening'}
      </h1>
    </header>
  );
}

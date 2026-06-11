'use client';

import { motion } from 'framer-motion';

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Types ─── */

export interface DashboardProps {
  /** Number of completed quests today */
  completedToday: number;
  /** Total quests today */
  totalToday: number;
  /** Current streak across all quests (best) */
  streak: number;
  /** Total XP balance */
  xpTotal: number;
  /** Today's XP earned */
  xpToday: number;
  /** Sleep data for the current month (compact chart) */
  sleepData?: Array<{ nightOf: string; hours: number }>;
}

/* ─── Stat pill ─── */

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 rounded-[12px] border border-line bg-surface px-3 py-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease }}
    >
      <span
        className="text-[22px] font-bold leading-none tabular-nums"
        style={{ color, fontFamily: 'var(--font-display)' }}
      >
        {value}
      </span>
      <span
        className="text-[11px] font-medium leading-tight text-ink-muted"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </span>
    </motion.div>
  );
}

/* ─── Compact sleep chart (SVG) ─── */

function SleepChart({ data }: { data: Array<{ nightOf: string; hours: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[32px]">
        <span className="text-[11px] text-ink-muted">No sleep data</span>
      </div>
    );
  }

  // Show last 28 entries max
  const entries = data.slice(-28);
  const maxHours = Math.max(...entries.map((d) => d.hours), 8);
  const barWidth = Math.max(3, Math.min(8, 100 / entries.length));
  const chartHeight = 32;

  return (
    <div className="flex items-end gap-[2px] h-[32px] overflow-hidden">
      {entries.map((entry, i) => {
        const h = (entry.hours / maxHours) * chartHeight;
        return (
          <motion.div
            key={entry.nightOf}
            className="rounded-t-[2px]"
            style={{
              width: `${barWidth}px`,
              height: `${h}px`,
              minHeight: '2px',
              backgroundColor: 'var(--color-info)',
              opacity: 0.6 + (entry.hours / 12) * 0.3,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${h}px` }}
            transition={{ duration: 0.25, ease, delay: i * 0.015 }}
            title={`${entry.nightOf}: ${entry.hours}h`}
          />
        );
      })}
    </div>
  );
}

/* ─── Main component ─── */

export default function MiniDashboard({
  completedToday,
  totalToday,
  streak,
  xpTotal,
  xpToday,
  sleepData,
}: DashboardProps) {
  const todayRatio = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* ─── Stats row ─── */}
      <div className="flex flex-wrap gap-2">
        <StatPill
          label={totalToday === 1 ? 'quest today' : 'quests today'}
          value={`${completedToday}/${totalToday}`}
          color="var(--color-ink)"
        />
        <StatPill
          label="streak"
          value={streak}
          color="var(--color-accent)"
        />
        <StatPill
          label={xpToday > 0 ? `+${xpToday} today` : 'total XP'}
          value={xpTotal}
          color="var(--color-xp)"
        />
      </div>

      {/* ─── Progress bar (today) ─── */}
      {totalToday > 0 && (
        <div className="relative h-[4px] rounded-full bg-line/40 overflow-hidden">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ backgroundColor: 'var(--color-success)' }}
            initial={{ width: 0 }}
            animate={{ width: `${todayRatio}%` }}
            transition={{ duration: 0.4, ease }}
          />
        </div>
      )}

      {/* ─── Compact sleep chart ─── */}
      <div className="rounded-[12px] border border-line bg-surface p-3">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sleep this month
          </span>
          {sleepData && sleepData.length > 0 && (
            <span
              className="text-[11px] text-ink-muted tabular-nums"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              avg {(
                sleepData.reduce((s, d) => s + d.hours, 0) / sleepData.length
              ).toFixed(1)}h
            </span>
          )}
        </div>
        <SleepChart data={sleepData ?? []} />
      </div>
    </div>
  );
}

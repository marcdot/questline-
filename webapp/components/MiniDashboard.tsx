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

/* ─── Metric (one column of the strip) ─── */

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-start gap-1 px-4 py-3.5 first:pl-5 last:pr-5">
      <span
        className="text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums"
        style={{ color, fontFamily: 'var(--font-display)' }}
      >
        {value}
      </span>
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.07em] leading-tight text-ink-muted"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </span>
    </div>
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
      {/* ─── Metric strip (one card, hairline-divided) ─── */}
      <motion.div
        className="liquid-card overflow-hidden rounded-[20px]"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease }}
      >
        <div className="relative z-[1] flex divide-x divide-line/70">
          <Metric
            label={totalToday === 1 ? 'quest today' : 'quests today'}
            value={`${completedToday}/${totalToday}`}
            color="var(--color-ink)"
          />
          <Metric
            label="streak"
            value={streak}
            color="var(--color-accent)"
          />
          <Metric
            label={xpToday > 0 ? `+${xpToday} today` : 'total XP'}
            value={xpTotal}
            color="var(--color-xp)"
          />
        </div>

        {/* Today's progress — integrated baseline of the strip */}
        {totalToday > 0 && (
          <div className="relative h-[3px] bg-line/40 overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full"
              style={{
                background:
                  'linear-gradient(90deg, var(--color-success), color-mix(in srgb, var(--color-success) 70%, var(--color-xp)))',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${todayRatio}%` }}
              transition={{ duration: 0.4, ease }}
            />
          </div>
        )}
      </motion.div>

      {/* ─── Compact sleep chart ─── */}
      <div className="liquid-card rounded-[20px] p-4">
        <div className="relative z-[1] flex items-center justify-between mb-2.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-muted"
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

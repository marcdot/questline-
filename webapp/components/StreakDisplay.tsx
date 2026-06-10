'use client';

import { motion } from 'framer-motion';

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Types ─── */

export interface StreakEntry {
  habitId: string;
  habitName: string;
  habitColor: string;
  /** Longest streak across all quests for this habit */
  longest: number;
  /** Current streak for the habit's best quest */
  current: number;
  /** The quest name with the highest streak */
  bestQuestName: string;
}

export interface StreakDisplayProps {
  streaks: StreakEntry[];
  /** "daily" or "weekly" showing which streak perspective */
  mode: 'daily' | 'weekly';
}

/* ─── Colour-coded streak card ─── */

function StreakCard({ entry, index }: { entry: StreakEntry; index: number }) {
  return (
    <motion.div
      className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-3 py-2.5"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease, delay: index * 0.04 }}
    >
      {/* Habit colour dot */}
      <div
        className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center"
        style={{ backgroundColor: entry.habitColor + '20' }}
      >
        <div
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: entry.habitColor }}
        />
      </div>

      {/* Habit info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-medium text-ink truncate"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {entry.habitName}
        </p>
        <p
          className="text-[11px] text-ink-muted truncate"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Best: {entry.bestQuestName}
        </p>
      </div>

      {/* Streak numbers */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span
            className="text-[18px] font-bold tabular-nums"
            style={{ color: entry.habitColor, fontFamily: 'var(--font-mono)' }}
          >
            {entry.current}
          </span>
          <p
            className="text-[9px] text-ink-muted uppercase tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            current
          </p>
        </div>
        <div className="w-px h-8 bg-line" />
        <div className="text-right">
          <span
            className="text-[18px] font-bold tabular-nums"
            style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}
          >
            {entry.longest}
          </span>
          <p
            className="text-[9px] text-ink-muted uppercase tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            longest
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main component ─── */

export default function StreakDisplay(props: StreakDisplayProps) {
  const { streaks } = props;
  if (!streaks || streaks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60px] rounded-[12px] border border-line bg-surface">
        <span className="text-[13px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
          No streak data yet
        </span>
      </div>
    );
  }

  // Sort by longest streak descending
  const sorted = [...streaks].sort((a, b) => b.longest - a.longest);

  return (
    <div className="space-y-2">
      {sorted.map((entry, i) => (
        <StreakCard key={entry.habitId} entry={entry} index={i} />
      ))}
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Types ─── */

export interface StatusEntry {
  periodKey: string;
  /** Display label for the period */
  label: string;
  items: StatusItem[];
}

export interface StatusItem {
  questId: string;
  questTitle: string;
  habitName: string;
  habitColor: string;
  completed: boolean;
  progress: number;
  target: number;
}

export interface StatusGridProps {
  /** Rows organised by period (most recent first) */
  data: StatusEntry[];
  /** Period label shown in header */
  periodLabel: string;
  /** Called when a quest row is tapped */
  onTapQuest?: (questId: string) => void;
}

/* ─── Single status cell ─── */

function StatusCell({ item }: { item: StatusItem }) {
  const fraction = item.target > 0 ? item.progress / item.target : 0;
  const isDone = item.completed || fraction >= 1;

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-[8px] transition-colors cursor-default"
      style={{
        backgroundColor: isDone ? item.habitColor + '12' : 'transparent',
      }}
      title={`${item.questTitle}: ${item.progress}/${item.target}`}
    >
      {/* Completion indicator */}
      <div
        className="h-3 w-3 rounded-full shrink-0 border"
        style={{
          backgroundColor: isDone ? item.habitColor : 'transparent',
          borderColor: item.habitColor,
          opacity: isDone ? 1 : 0.6,
        }}
      />

      {/* Quest name */}
      <span
        className="text-[12px] text-ink truncate flex-1 min-w-0"
        style={{
          fontFamily: 'var(--font-body)',
          opacity: isDone ? 0.8 : 1,
        }}
      >
        {item.questTitle}
      </span>

      {/* Count */}
      <span
        className="text-[10px] tabular-nums shrink-0"
        style={{
          color: isDone ? item.habitColor : 'var(--color-ink-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {item.progress}/{item.target}
      </span>
    </div>
  );
}

/* ─── Status column (one period) ─── */

function StatusColumn({ entry, index }: { entry: StatusEntry; index: number }) {
  const completedCount = entry.items.filter(
    (i) => i.completed || i.progress >= i.target,
  ).length;

  return (
    <motion.div
      className="liquid-card rounded-[16px] p-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease, delay: index * 0.03 }}
    >
      {/* Period header */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[11px] font-semibold text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {entry.label}
        </span>
        <span
          className="text-[10px] text-ink-muted tabular-nums"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {completedCount}/{entry.items.length}
        </span>
      </div>

      {/* Progress mini-bar */}
      {entry.items.length > 0 && (
        <div className="h-[2px] rounded-full bg-line/40 mb-2 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: 'var(--color-success)' }}
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / entry.items.length) * 100}%` }}
            transition={{ duration: 0.3, ease, delay: index * 0.03 }}
          />
        </div>
      )}

      {/* Items */}
      <div className="space-y-0.5">
        {entry.items.map((item) => (
          <StatusCell key={item.questId} item={item} />
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Main component ─── */

export default function StatusGrid(props: StatusGridProps) {
  const { data } = props;

  // Trim leading periods with no quests so the grid starts at first activity
  // (avoids a long run of empty "0/0" columns for new/sparse accounts).
  const firstActive = data.findIndex((e) => e.items.length > 0);
  const trimmed = firstActive > 0 ? data.slice(firstActive) : data;

  if (!trimmed || trimmed.length === 0 || firstActive === -1) {
    return (
      <div className="liquid-card flex items-center justify-center h-[80px] rounded-[16px]">
        <span className="text-[13px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
          No status data for this period
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Column layout — scrollable horizontally */}
      <div className="overflow-x-auto -mx-1 pb-1">
        <div className="flex gap-3" style={{ minWidth: Math.max(trimmed.length * 200, 300) }}>
          {trimmed.map((entry, i) => (
            <div key={entry.periodKey} className="w-[200px] shrink-0">
              <StatusColumn entry={entry} index={i} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

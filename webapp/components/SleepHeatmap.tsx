'use client';

import { motion } from 'framer-motion';

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Types ─── */

export interface SleepDay {
  date: string;       // YYYY-MM-DD
  dayLabel: string;   // "Mon", "Tue" etc.
  hours: number;      // hours slept (0 = no data)
  hasData: boolean;
}

export interface SleepHeatmapProps {
  weeks: SleepDay[][];
}

/* ─── Colour intensity from hours ─── */

function heatColor(hours: number): string {
  if (hours <= 0) return 'var(--color-surface-2, #eae7e0)';
  if (hours < 5) return 'var(--color-danger)';
  if (hours < 7) return 'var(--color-warning)';
  if (hours <= 9) return 'var(--color-success)';
  return 'var(--color-success)';
}

function heatOpacity(hours: number): number {
  if (hours <= 0) return 0.3;
  if (hours < 5) return 0.5;
  if (hours < 7) return 0.6;
  if (hours <= 9) return 0.75;
  return 0.9;
}

/* ─── Single heatmap cell ─── */

function HeatCell({ day }: { day: SleepDay }) {
  return (
    <motion.div
      className="rounded-[4px]"
      style={{
        width: 16,
        height: 16,
        backgroundColor: heatColor(day.hours),
        opacity: heatOpacity(day.hours),
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.15, ease }}
      title={`${day.date}: ${day.hasData ? day.hours + 'h' : 'no data'}`}
    />
  );
}

/* ─── Week column ─── */

function WeekColumn({ days, weekLabel }: { days: SleepDay[]; weekLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-[3px]">
      <span
        className="text-[8px] text-ink-muted uppercase tracking-[0.04em] mb-[2px]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {weekLabel}
      </span>
      {days.map((day) => (
        <HeatCell key={day.date} day={day} />
      ))}
    </div>
  );
}

/* ─── Main component ─── */

export default function SleepHeatmap({ weeks }: SleepHeatmapProps) {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[160px] rounded-[12px] border border-line bg-surface">
        <span className="text-[13px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
          No sleep data
        </span>
      </div>
    );
  }

  // Compute average
  const allDays = weeks.flat();
  const dataDays = allDays.filter((d) => d.hasData);
  const avgHours = dataDays.length > 0
    ? (dataDays.reduce((s, d) => s + d.hours, 0) / dataDays.length).toFixed(1)
    : '—';

  return (
    <div className="rounded-[12px] border border-line bg-surface p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Sleep Heatmap
        </span>
        <span
          className="text-[11px] text-ink-muted tabular-nums"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          avg {avgHours}h · {dataDays.length} nights
        </span>
      </div>

      {/* Heatmap */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {weeks.map((week, wi) => {
          const firstDay = week.find((d) => d.hasData);
          const label = firstDay
            ? new Date(firstDay.date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : '';
          return (
            <WeekColumn key={wi} days={week} weekLabel={label} />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[9px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
          Less
        </span>
        <div className="flex gap-[2px]">
          {[0, 4, 6, 7, 9].map((h) => (
            <div
              key={h}
              className="rounded-[2px]"
              style={{
                width: 10,
                height: 10,
                backgroundColor: heatColor(h),
                opacity: heatOpacity(h),
              }}
            />
          ))}
        </div>
        <span className="text-[9px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
          More
        </span>
      </div>
    </div>
  );
}

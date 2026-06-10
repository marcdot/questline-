'use client';

import { motion } from 'framer-motion';

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Types ─── */

export interface XpDataPoint {
  /** Label for the period (e.g. "Jun 7", "W23", "Jun", "2026") */
  label: string;
  /** ISO date string for ordering */
  sortKey: string;
  /** Total XP earned in that period */
  xp: number;
}

export interface XpChartProps {
  data: XpDataPoint[];
  periodLabel: string;
}

/* ─── SVG Spark area chart ─── */

export default function XpChart({ data, periodLabel }: XpChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[160px] rounded-[12px] border border-line bg-surface">
        <span className="text-[13px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
          No XP data for this period
        </span>
      </div>
    );
  }

  const width = data.length * 32; // min spacing
  const height = 140;
  const padding = { top: 8, bottom: 20, left: 0, right: 0 };
  const chartW = width;
  const chartH = height - padding.top - padding.bottom;

  const maxXp = Math.max(...data.map((d) => d.xp), 1);
  const barWidth = Math.max(6, Math.min(20, chartW / data.length - 4));

  // Y-axis ticks
  const yTicks = 3;

  return (
    <div className="rounded-[12px] border border-line bg-surface p-3">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          XP gained
        </span>
        <span
          className="text-[11px] text-ink-muted tabular-nums"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          per {periodLabel} · {data.reduce((s, d) => s + d.xp, 0)} total
        </span>
      </div>

      <div className="overflow-x-auto overflow-y-hidden -mx-1">
        <svg
          width={Math.max(chartW, 200)}
          height={height}
          viewBox={`0 0 ${Math.max(chartW, 200)} ${height}`}
          className="min-w-full"
        >
          {/* ─── Y-axis grid lines + labels ─── */}
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const y = padding.top + chartH - (i / yTicks) * chartH;
            const val = Math.round((i / yTicks) * maxXp);
            return (
              <g key={i}>
                <line
                  x1={0}
                  y1={y}
                  x2={Math.max(chartW, 200)}
                  y2={y}
                  stroke="var(--color-line)"
                  strokeWidth="1"
                  opacity="0.4"
                />
                {val > 0 && (
                  <text
                    x={4}
                    y={y - 4}
                    fontSize="10"
                    fill="var(--color-ink-muted)"
                    fontFamily="var(--font-mono)"
                  >
                    {val}
                  </text>
                )}
              </g>
            );
          })}

          {/* ─── Bars ─── */}
          {data.map((point, i) => {
            const barH = (point.xp / maxXp) * chartH;
            const x = i * (chartW / data.length) + (chartW / data.length - barWidth) / 2;
            const y = padding.top + chartH - barH;
            return (
              <motion.g key={point.sortKey}>
                <motion.rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={2}
                  fill="var(--color-xp)"
                  opacity="0.7"
                  initial={{ height: 0, y: padding.top + chartH }}
                  animate={{ height: barH, y }}
                  transition={{ duration: 0.3, ease, delay: i * 0.02 }}
                />
                {/* ─── Label on hover ─── */}
                <title>{`${point.label}: ${point.xp} XP`}</title>
              </motion.g>
            );
          })}

          {/* ─── X-axis labels (show every Nth to avoid crowding) ─── */}
          {data.map((point, i) => {
            const step = Math.max(1, Math.floor(data.length / 8));
            if (i % step !== 0 && i !== data.length - 1) return null;
            const x = i * (chartW / data.length) + (chartW / data.length) / 2;
            return (
              <text
                key={point.sortKey}
                x={x}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-ink-muted)"
                fontFamily="var(--font-mono)"
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

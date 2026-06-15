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

/* ─── Round a max value up to a "nice" axis ceiling (gives headroom so the
   tallest bar never slams the top gridline, and labels read as round numbers). */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step =
    n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 7.5 ? 7.5 : 10;
  return step * pow;
}

/* ─── SVG bar chart ─── */

export default function XpChart({ data: rawData, periodLabel }: XpChartProps) {
  // Trim leading empty periods so bars start at first earned XP (no long run
  // of blank columns dragging the chart to the right for sparse accounts).
  const firstNonZero = (rawData ?? []).findIndex((d) => d.xp > 0);
  const data = firstNonZero > 0 ? rawData.slice(firstNonZero) : rawData;

  if (!data || data.length === 0 || firstNonZero === -1) {
    return (
      <div className="liquid-card flex items-center justify-center h-[160px] rounded-[16px]">
        <span className="text-[13px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
          No XP data for this period
        </span>
      </div>
    );
  }

  // Layout — a left gutter holds the y-axis labels so they never overlap bars,
  // and generous top/bottom padding keeps the top label + x labels off the edges.
  const gutterL = 32;
  const padTop = 24;
  const padBottom = 26;
  const height = 168;
  const chartH = height - padTop - padBottom;

  // Slot width adapts: few bars spread out to fill, many bars stay compact
  // (and the container scrolls). Keeps the chart from clustering at the left.
  const slot = data.length <= 6 ? 56 : 34;
  const plotW = Math.max(data.length * slot, 200);
  const svgW = gutterL + plotW;
  const slotW = plotW / data.length;

  // Scale to a rounded ceiling so the tallest bar has headroom under the top line.
  const rawMax = Math.max(...data.map((d) => d.xp), 1);
  const maxScale = niceMax(rawMax);
  const barWidth = Math.max(6, Math.min(22, slotW - 8));

  // Y-axis ticks
  const yTicks = 3;

  return (
    <div className="liquid-card rounded-[16px] p-3">
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
          width={svgW}
          height={height}
          viewBox={`0 0 ${svgW} ${height}`}
          className="min-w-full"
        >
          {/* ─── Y-axis grid lines + labels (labels centered in the gutter) ─── */}
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const y = padTop + chartH - (i / yTicks) * chartH;
            const val = Math.round((i / yTicks) * maxScale);
            return (
              <g key={i}>
                <line
                  x1={gutterL}
                  y1={y}
                  x2={svgW}
                  y2={y}
                  stroke="var(--color-line)"
                  strokeWidth="1"
                  opacity="0.4"
                />
                {i > 0 && (
                  <text
                    x={gutterL - 6}
                    y={y + 3}
                    textAnchor="end"
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

          {/* ─── Bars (small non-zero values keep a visible floor) ─── */}
          {data.map((point, i) => {
            const barH = Math.max((point.xp / maxScale) * chartH, point.xp > 0 ? 3 : 0);
            const x = gutterL + i * slotW + (slotW - barWidth) / 2;
            const y = padTop + chartH - barH;
            return (
              <motion.g key={point.sortKey}>
                <motion.rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  fill="var(--color-xp)"
                  opacity="0.8"
                  initial={{ height: 0, y: padTop + chartH }}
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
            const x = gutterL + i * slotW + slotW / 2;
            return (
              <text
                key={point.sortKey}
                x={x}
                y={height - 7}
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

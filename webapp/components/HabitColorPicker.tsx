'use client';

import type { Habit } from '@/lib/types';

/* ─── 8-colour palette (docs/03 §2) ─── */
export const HABIT_COLORS = [
  '#E8743B', // ember
  '#E0B040', // gold
  '#5AA469', // fern
  '#3E9CA8', // teal
  '#4F86C6', // sky
  '#7A6CD8', // iris
  '#C85A8E', // rose
  '#8A8F98', // slate
] as const;

export type HabitColor = (typeof HABIT_COLORS)[number];

/* ─── Props ─── */

export interface HabitColorPickerProps {
  /** Currently selected colour hex */
  value: string;
  /** Called when user picks a colour */
  onChange: (color: string) => void;
  /** Optional existing habits to show which colour is already used */
  existingHabits?: Habit[];
}

/* ─── Component ─── */

export default function HabitColorPicker({
  value,
  onChange,
  existingHabits,
}: HabitColorPickerProps) {
  const usedColors = new Set(existingHabits?.map((h) => h.color.toLowerCase()) ?? []);

  return (
    <div className="flex flex-wrap gap-2">
      {HABIT_COLORS.map((color) => {
        const isSelected = value.toLowerCase() === color.toLowerCase();
        const isUsed = usedColors.has(color.toLowerCase());

        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            disabled={isUsed && !isSelected}
            title={
              isUsed && !isSelected
                ? `"${color}" is already used by another habit`
                : color
            }
            className={`
              relative h-9 w-9 rounded-full transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
              disabled:opacity-30 disabled:cursor-not-allowed
              ${isSelected ? 'ring-2 ring-accent ring-offset-2 scale-110' : 'hover:scale-105'}
            `}
            style={{ backgroundColor: color }}
            aria-label={`Colour ${color}`}
            aria-checked={isSelected}
            role="radio"
          >
            {isSelected && (
              <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold pointer-events-none">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Validation helper ─── */

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_RE.test(color);
}

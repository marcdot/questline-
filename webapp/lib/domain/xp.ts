/**
 * XP computation — Questline domain (docs/05 §5)
 *
 * Canonical formula (keep tunable in one place):
 *   BASE_COMPLETE        = 10
 *   PER_PROGRESS         = 0 (MVP: progress alone gives 0)
 *   STREAK_BONUS(streak) = min(streak, 7) * 2     — +2 per streak, capped at +14
 *   CADENCE_MULT         = { daily:1.0, weekly:2.0, monthly:4.0, yearly:8.0 }
 *
 *   xp = round( (BASE_COMPLETE + STREAK_BONUS(streak)) * CADENCE_MULT[cadence] )
 */
import type { Cadence } from '@/lib/types';

/* ─── Constants (tunable in one place) ─── */

export const BASE_COMPLETE = 10;
export const PER_PROGRESS = 0; // MVP: only completion pays (avoid grinding)

const CADENCE_MULTIPLIERS: Record<Cadence, number> = {
  daily: 1.0,
  weekly: 2.0,
  monthly: 4.0,
  yearly: 8.0,
};

/* ─── Public API ─── */

/**
 * Compute streak bonus XP.
 * STREAK_BONUS(s) = min(streak, 7) * 2, capped at +14.
 */
export function streakBonus(streak: number): number {
  return Math.min(Math.max(0, streak), 7) * 2;
}

/**
 * Compute total XP for completing a quest instance.
 *
 * @param streak - The streak count AFTER this completion.
 * @param cadence - The quest's cadence.
 * @returns XP amount (always positive).
 */
export function computeXp(streak: number, cadence: Cadence): number {
  const base = BASE_COMPLETE + streakBonus(streak);
  const mult = CADENCE_MULTIPLIERS[cadence];
  return Math.round(base * mult);
}

/**
 * Compute the display level from total XP.
 * level = floor(sqrt(balance / 50)) + 1
 * Used when xp_display = 'detailed'.
 */
export function xpToLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 50)) + 1;
}

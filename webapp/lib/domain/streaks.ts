/**
 * Streak computation — Questline domain (docs/05 §6)
 *
 * A streak counts consecutive completed periods for a quest.
 *
 * Rules:
 *   If new period is IMMEDIATELY AFTER last_period_key → current + 1
 *   If new period == last_period_key → no change (idempotent)
 *   Otherwise → reset to 1
 *
 * "Immediately after" is cadence-aware: next day / next ISO week / next month / next year.
 */
import type { Cadence } from '@/lib/types';
import { nextPeriodKey } from './period-keys';

export interface StreakState {
  current: number;
  longest: number;
  lastPeriodKey: string | null;
}

/**
 * Compute a new streak state after completing a period.
 *
 * @param prev - The previous streak state (or null for first ever completion).
 * @param newPeriodKey - The period key being completed.
 * @param cadence - The quest's cadence (used for consecutive detection).
 * @returns The new streak state.
 */
export function computeStreak(
  prev: StreakState | null,
  newPeriodKey: string,
  cadence: Cadence,
): StreakState {
  if (!prev) {
    return { current: 1, longest: 1, lastPeriodKey: newPeriodKey };
  }

  const expectedNext = nextPeriodKey(prev.lastPeriodKey!, cadence);

  if (newPeriodKey === prev.lastPeriodKey) {
    // Idempotent re-complete — no change
    return { ...prev };
  }

  if (newPeriodKey === expectedNext) {
    // Consecutive period
    const newCurrent = prev.current + 1;
    return {
      current: newCurrent,
      longest: Math.max(prev.longest, newCurrent),
      lastPeriodKey: newPeriodKey,
    };
  }

  // Gap — streak resets
  return {
    current: 1,
    longest: prev.longest,
    lastPeriodKey: newPeriodKey,
  };
}

/**
 * For child quests of a weekly+ parent: check if the previous weekday's child
 * was completed in the same parent period.
 *
 * @param prevWeekdayPeriodKey - The period key of the previous weekday's child (or null)
 * @param prevStreak - The previous streak state
 * @param newPeriodKey - The current child's period key
 * @returns The new streak state
 */
export function computeChildStreak(
  prevStreak: StreakState | null,
  newPeriodKey: string,
  prevWeekdayPeriodKey: string | null,
): StreakState {
  if (!prevStreak) {
    return { current: 1, longest: 1, lastPeriodKey: newPeriodKey };
  }

  if (newPeriodKey === prevStreak.lastPeriodKey) {
    return { ...prevStreak };
  }

  if (prevWeekdayPeriodKey != null) {
    // Previous weekday was completed — chain streak
    const newCurrent = prevStreak.current + 1;
    return {
      current: newCurrent,
      longest: Math.max(prevStreak.longest, newCurrent),
      lastPeriodKey: newPeriodKey,
    };
  }

  // Gap (or first weekday in a new cycle without previous completion)
  return {
    current: 1,
    longest: prevStreak.longest,
    lastPeriodKey: newPeriodKey,
  };
}

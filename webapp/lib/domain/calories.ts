/**
 * Questline — Walk calorie estimation (Q-002, Phase 1)
 *
 * Formula-based (no Apple Health yet): kcal = MET × weight_kg × duration_hours.
 * MET values from the Compendium of Physical Activities (walking by pace).
 */

export type WalkPace = 'slow' | 'moderate' | 'brisk' | 'fast' | 'very_fast';

/** MET by walking pace (ticket Q-002 reference table). */
export const WALK_MET: Record<WalkPace, number> = {
  slow: 2.5,       // ~2.0 mph
  moderate: 3.5,   // ~3.0 mph
  brisk: 4.3,      // ~3.5 mph
  fast: 5.0,       // ~4.0 mph
  very_fast: 6.0,  // ~4.5+ mph
};

export const WALK_PACE_LABELS: Record<WalkPace, string> = {
  slow: 'Slow',
  moderate: 'Moderate',
  brisk: 'Brisk',
  fast: 'Fast',
  very_fast: 'Very fast',
};

/**
 * Calories burned walking. Returns 0 (not NaN) when weight or duration is
 * missing/invalid, so callers can simply hide a zero result.
 */
export function walkCalories(
  weightKg: number | null | undefined,
  minutes: number | null | undefined,
  pace: WalkPace = 'moderate',
): number {
  const w = Number(weightKg);
  const m = Number(minutes);
  if (!(w > 0) || !(m > 0)) return 0;
  return Math.round(WALK_MET[pace] * w * (m / 60));
}

/**
 * Heuristic: is this quest a walk? Matches "walk" in the habit name or quest
 * title (case-insensitive). ponytail: name-match heuristic — a dedicated walk
 * habit type would be the upgrade path if precision matters.
 */
export function isWalkQuest(questTitle: string, habitName?: string | null): boolean {
  return /\bwalk(ing|s|ed)?\b/i.test(`${habitName ?? ''} ${questTitle}`);
}

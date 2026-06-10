/**
 * Questline — Optimistic store
 *
 * Manages optimistic XP/streak previews for quest instances.
 * Uses the canonical domain library (computeXp, computeStreak) to preview
 * values locally before server confirmation. On sync, adopts the server value.
 *
 * This is NOT a full state manager — it's a thin projection layer over
 * the domain lib for instant feedback.
 */

import type { Cadence, QuestInstance } from '@/lib/types';
import { computeXp, computeStreak, type StreakState } from '@/lib/domain';

/* ─── Types ─── */

export interface OptimisticInstance extends QuestInstance {
  /** Optimistic progress (may differ from server until sync) */
  optimisticProgress: number;
  /** Optimistic completion flag */
  optimisticCompleted: boolean;
  /** Whether we have a pending event for this instance */
  pending: boolean;
  /** Last optimistic XP grant (for display) */
  optimisticXp: number;
  /** Optimistic streak after completion */
  optimisticStreak: number;
}

export interface SyncResult {
  instanceId: string;
  serverProgress: number;
  serverCompleted: boolean;
  serverXp: number;
  serverStreak: number;
}

/* ─── Optimistic helpers ─── */

/**
 * Compute the optimistic state after an increment (+1) event.
 */
export function optimisticIncrement(
  instance: QuestInstance,
  streakState: StreakState | null,
  cadence: Cadence,
): { instance: OptimisticInstance; streak: StreakState } {
  const newProgress = Math.min(instance.progress + 1, instance.target_count);
  const nowCompleted = newProgress >= instance.target_count && !instance.completed;

  let newStreak = streakState;
  if (nowCompleted) {
    // If completed, compute new streak
    newStreak = computeStreak(streakState, instance.period_key, cadence);
  }

  const xp = nowCompleted ? computeXp(newStreak!.current, cadence) : 0;

  return {
    instance: {
      ...instance,
      optimisticProgress: newProgress,
      optimisticCompleted: instance.completed || nowCompleted,
      pending: true,
      optimisticXp: xp,
      optimisticStreak: newStreak?.current ?? 0,
    },
    streak: newStreak ?? { current: 0, longest: 0, lastPeriodKey: null },
  };
}

/**
 * Compute the optimistic state after a complete event (hold-to-complete).
 */
export function optimisticComplete(
  instance: QuestInstance,
  streakState: StreakState | null,
  cadence: Cadence,
): { instance: OptimisticInstance; streak: StreakState } {
  if (instance.completed) {
    // Already completed — no change
    return {
      instance: {
        ...instance,
        optimisticProgress: instance.progress,
        optimisticCompleted: true,
        pending: false,
        optimisticXp: 0,
        optimisticStreak: 0,
      },
      streak: streakState ?? { current: 0, longest: 0, lastPeriodKey: null },
    };
  }

  const newStreak = computeStreak(streakState, instance.period_key, cadence);
  const xp = computeXp(newStreak.current, cadence);

  return {
    instance: {
      ...instance,
      optimisticProgress: instance.target_count,
      optimisticCompleted: true,
      pending: true,
      optimisticXp: xp,
      optimisticStreak: newStreak.current,
    },
    streak: newStreak,
  };
}

/**
 * Merge server-sync data back into local state, replacing optimistic values.
 */
export function applySyncResult(
  local: OptimisticInstance,
  sync: SyncResult,
): OptimisticInstance {
  return {
    ...local,
    progress: sync.serverProgress,
    optimisticProgress: sync.serverProgress,
    completed: sync.serverCompleted,
    optimisticCompleted: sync.serverCompleted,
    pending: false,
    optimisticXp: sync.serverXp,
    optimisticStreak: sync.serverStreak,
  };
}

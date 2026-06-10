'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestInstance, Quest, Habit } from '@/lib/types';

/* ─── Motion tokens (docs/03 §5) ─── */
const fast = 0.12;
const base = 0.2;
const ease = [0.2, 0, 0, 1] as const;
const springPop = { stiffness: 420, damping: 30, mass: 0.8 };
const springNudge = { stiffness: 420, damping: 30, mass: 1 };

/* ─── Props ─── */

export interface QuestCardProps {
  instance: QuestInstance;
  quest: Quest;
  habit: Habit | null;
  /** Called on tap (+1). Return true if the event was accepted. */
  onIncrement?: (instanceId: string, delta: number) => void;
  /** Called on hold complete. Return true if the event was accepted. */
  onComplete?: (instanceId: string, delta: number) => void;
  isOptimistic?: boolean;
  optimisticXp?: number;
  optimisticStreak?: number;
}

/* ─── Local state machine ───
 * idle       → normal state
 * tapping    → short tap (<200ms), shows +1 float
 * holding    → long-press in progress, fill racing toward full
 * completing → release at full, burst animation playing
 * complete   → already completed
 */

type CardPhase = 'idle' | 'tapping' | 'holding' | 'completing' | 'complete';

export default function QuestCard({
  instance,
  quest,
  habit,
  onIncrement,
  onComplete,
  optimisticXp,
  optimisticStreak,
}: QuestCardProps) {
  const isCompleted = instance.completed || instance.progress >= instance.target_count;
  const habitColor = habit?.color ?? '#8A8F98';
  const ratio = instance.progress / Math.max(instance.target_count, 1);
  const progressPct = Math.min(ratio * 100, 100);

  const [phase, setPhase] = useState<CardPhase>(isCompleted ? 'complete' : 'idle');
  const [holdProgress, setHoldProgress] = useState(0);
  const [showFloat, setShowFloat] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [xpCountUp, setXpCountUp] = useState(optimisticXp ?? 0);
  const [streakCountUp, setStreakCountUp] = useState(optimisticStreak ?? 0);

  const holdStartRef = useRef<number>(0);
  const holdAnimRef = useRef<number>(0);
  const holdCompletedRef = useRef(false);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Tap (+1) ─── */
  const handleTap = useCallback(() => {
    if (phase === 'complete' || isCompleted) return;

    // Immediate visual response: show +1 float
    setShowFloat(true);
    setTimeout(() => setShowFloat(false), 600);

    // Optimistic: call onIncrement
    onIncrement?.(instance.id, 1);
  }, [phase, isCompleted, instance.id, onIncrement]);

  /* ─── Hold (complete) ─── */
  const handlePointerDown = useCallback(
    () => {
      if (phase === 'complete' || isCompleted) return;

      holdStartRef.current = Date.now();
      holdCompletedRef.current = false;
      let fillValue = 0;

      const startFill = () => {
        holdAnimRef.current = requestAnimationFrame(function tick() {
          const elapsed = Date.now() - holdStartRef.current;
          // Fill races toward full over ~500ms
          fillValue = Math.min(elapsed / 500, 1);
          setHoldProgress(fillValue);
          setPhase('holding');

          if (fillValue >= 1) {
            // Held long enough — mark complete
            holdCompletedRef.current = true;
            setPhase('completing');
            setShowBurst(true);
            onComplete?.(instance.id, instance.target_count - instance.progress);
            return;
          }

          holdAnimRef.current = requestAnimationFrame(tick);
        });
      };

      // Delay start of fill to distinguish tap from hold (~150ms)
      tapTimeoutRef.current = setTimeout(() => {
        if (!holdCompletedRef.current) {
          startFill();
        }
      }, 150);
    },
    [phase, isCompleted, instance.id, instance.progress, instance.target_count, onComplete],
  );

  const handlePointerUp = useCallback(() => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (holdAnimRef.current) {
      cancelAnimationFrame(holdAnimRef.current);
      holdAnimRef.current = 0;
    }

    if (phase === 'holding' && !holdCompletedRef.current) {
      // Released early — fill recedes
      setHoldProgress(0);
      setPhase('idle');

      // If it was a short tap, trigger +1
      const elapsed = Date.now() - holdStartRef.current;
      if (elapsed < 200) {
        handleTap();
      }
    }

    if (holdCompletedRef.current) {
      // Already transitioning to complete
    }
  }, [phase, handleTap]);

  const handlePointerLeave = handlePointerUp;

  /* ─── After completion burst finishes ─── */
  const onBurstComplete = useCallback(() => {
    setPhase('complete');
    setHoldProgress(0);
    setShowBurst(false);
    setXpCountUp(optimisticXp ?? 0);
    setStreakCountUp(optimisticStreak ?? 0);
  }, [optimisticXp, optimisticStreak]);

  /* ─── Derived ─── */
  const displayProgress = phase === 'holding'
    ? Math.max(progressPct, holdProgress * 100) // fill from current to full
    : phase === 'completing' || phase === 'complete'
      ? 100
      : progressPct;

  const displayTitle = quest.title || 'Untitled';
  const displayUnit = quest.unit ?? '';
  const displayCount = `${instance.progress}/${instance.target_count}`;

  return (
    <motion.div
      className="relative overflow-hidden rounded-[16px] border border-line bg-surface shadow-sm"
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: phase === 'tapping' ? 0.97 : 1,
      }}
      transition={{
        type: 'spring',
        ...springNudge,
        duration: base,
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{ touchAction: 'manipulation', cursor: 'pointer' }}
    >
      {/* ─── Leading habit-colour bar (3-4px) ─── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[16px]"
        style={{ backgroundColor: habitColor, opacity: isCompleted ? 0.5 : 1 }}
      />

      {/* ─── Progress fill background ─── */}
      <motion.div
        className="absolute inset-0 rounded-[16px] origin-left pointer-events-none"
        style={{ backgroundColor: habitColor, opacity: 0.08 }}
        animate={{
          scaleX: phase === 'completing' || phase === 'complete' ? 1 : displayProgress / 100,
          opacity: phase === 'completing' || phase === 'complete' ? 0.2 : 0.08,
        }}
        transition={{ duration: fast, ease }}
      />

      {/* ─── Completion burst flash ─── */}
      <AnimatePresence>
        {showBurst && (
          <motion.div
            className="absolute inset-0 rounded-[16px] pointer-events-none z-10"
            style={{ backgroundColor: habitColor }}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            onAnimationComplete={() => {
              if (phase === 'completing') onBurstComplete();
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Content (neutral text) ─── */}
      <div className="relative z-[5] flex items-center gap-3 px-4 py-3.5">
        {/* Title + progress */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] font-medium leading-[1.4] text-ink truncate"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {displayTitle}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[13px] font-medium leading-[1.3]"
              style={{
                color: isCompleted ? 'var(--color-success)' : 'var(--color-ink-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {displayCount}
              {displayUnit ? ` ${displayUnit}` : ''}
            </span>
            {isCompleted && (
              <motion.svg
                className="w-4 h-4"
                style={{ color: 'var(--color-success)' }}
                viewBox="0 0 16 16"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease }}
              >
                <motion.path
                  d="M3 8.5L6.5 12L13 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, ease }}
                />
              </motion.svg>
            )}
          </div>
        </div>

        {/* ─── XP + Streak pills ─── */}
        {(phase === 'completing' || isCompleted) && (optimisticXp ?? 0) > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <motion.div
              className="flex items-center gap-1 rounded-full bg-xp/10 px-2.5 py-1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springPop}
            >
              <span className="text-[11px] font-semibold text-xp" style={{ fontFamily: 'var(--font-mono)' }}>
                +{xpCountUp}
              </span>
              <span className="text-[10px] text-xp/70">XP</span>
            </motion.div>

            <motion.div
              className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...springPop, delay: 0.08 }}
            >
              <span className="text-[11px] font-semibold text-accent" style={{ fontFamily: 'var(--font-mono)' }}>
                +{streakCountUp}
              </span>
              <span className="text-[10px] text-accent/70">🔥</span>
            </motion.div>
          </div>
        )}

        {/* ─── Progress bar (bottom strip) ─── */}
        <div className="absolute bottom-0 left-[4px] right-0 h-[3px] bg-line/40 rounded-br-[16px] overflow-hidden pointer-events-none">
          <motion.div
            className="h-full rounded-br-[16px]"
            style={{
              backgroundColor: habitColor,
              opacity: isCompleted ? 0.5 : 0.8,
            }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: fast, ease }}
          />
        </div>
      </div>

      {/* ─── +1 Float ─── */}
      <AnimatePresence>
        {showFloat && (
          <motion.div
            className="absolute top-2 right-3 z-20 pointer-events-none"
            initial={{ y: 0, opacity: 1, scale: 0.5 }}
            animate={{ y: -24, opacity: 0, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <span
              className="text-[18px] font-bold"
              style={{ color: habitColor, fontFamily: 'var(--font-mono)' }}
            >
              +1
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hold fill ring indicator ─── */}
      {phase === 'holding' && (
        <motion.div
          className="absolute inset-0 rounded-[16px] pointer-events-none z-0"
          style={{
            background: `conic-gradient(${habitColor} ${holdProgress * 360}deg, transparent ${holdProgress * 360}deg)`,
            opacity: 0.15,
          }}
        />
      )}
    </motion.div>
  );
}

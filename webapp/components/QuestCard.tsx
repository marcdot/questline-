'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestInstance, Quest, Habit } from '@/lib/types';

/* ─── Motion tokens (docs/03 §5) ─── */
const fast = 0.12;
const base = 0.2;
const ease = [0.2, 0, 0, 1] as const;
const springPop = { stiffness: 420, damping: 30, mass: 0.8 };
const springNudge = { stiffness: 420, damping: 30, mass: 1 };

/* ─── Ember Fill signature (design.html §6) ─── */
const HOLD_MS = 560;
const TAP_MS = 170;
const RECEDE_MS = 200;
// cubic-bezier(0.22, 0.61, 0.36, 1) approximation
const easeEmber = (t: number) => 1 - Math.pow(1 - t, 2.2);

/* ─── Props ─── */

export interface QuestCardProps {
  instance: QuestInstance;
  quest: Quest;
  habit: Habit | null;
  /** Called on tap (+1). Return true if the event was accepted. */
  onIncrement?: (instanceId: string, delta: number) => void;
  /** Called on hold complete. Return true if the event was accepted. */
  onComplete?: (instanceId: string, delta: number) => void;
  /** Called on tap-to-undo of an already-completed quest (Q-003). */
  onUncomplete?: (instanceId: string, delta: number) => void;
  isOptimistic?: boolean;
  optimisticXp?: number;
  optimisticStreak?: number;
}

/* ─── Local state machine ───
 * idle       → normal state
 * holding    → long-press in progress, ember fill racing toward full
 * completing → release at full, burst animation playing
 * complete   → already completed
 */

type CardPhase = 'idle' | 'holding' | 'completing' | 'complete';

export default function QuestCard({
  instance,
  quest,
  habit,
  onIncrement,
  onComplete,
  onUncomplete,
  optimisticXp,
  optimisticStreak,
}: QuestCardProps) {
  const isCompleted = instance.completed || instance.progress >= instance.target_count;
  const habitColor = habit?.color ?? '#8A8F98';
  const accentColor = '#D9542B'; // --accent ember ignition
  const ratio = instance.progress / Math.max(instance.target_count, 1);
  const progressPct = Math.min(ratio * 100, 100);

  const [phase, setPhase] = useState<CardPhase>(isCompleted ? 'complete' : 'idle');
  const [fillDisplay, setFillDisplay] = useState(isCompleted ? 1 : 0);
  const [showFloat, setShowFloat] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [xpCountUp, setXpCountUp] = useState(optimisticXp ?? 0);
  const [streakCountUp, setStreakCountUp] = useState(optimisticStreak ?? 0);

  /* ─── Refs for animation loop (not rendered directly) ─── */
  const fillRef = useRef(isCompleted ? 1 : 0);
  const holdingRef = useRef(false);
  const completedRef = useRef(false);
  const startTRef = useRef(0);
  const rafRef = useRef(0);
  const recedeStartRef = useRef(0);
  const recedingRef = useRef(false);
  const fromValueRef = useRef(0);
  // Ref wrappers let callbacks reference themselves without hoisting issues
  const fillLoopRef = useRef<() => void>(() => {});
  const recedeLoopRef = useRef<() => void>(() => {});
  // Stable prop refs for animation callbacks
  const onCompleteRef = useRef(onComplete);
  const onIncrementRef = useRef(onIncrement);
  const onUncompleteRef = useRef(onUncomplete);
  const instanceIdRef = useRef(instance.id);
  const instanceProgressRef = useRef(instance.progress);
  const instanceTargetRef = useRef(instance.target_count);
  // Keep refs in sync with latest props
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onIncrementRef.current = onIncrement; }, [onIncrement]);
  useEffect(() => { onUncompleteRef.current = onUncomplete; }, [onUncomplete]);
  useEffect(() => { instanceIdRef.current = instance.id; }, [instance.id]);
  useEffect(() => { instanceProgressRef.current = instance.progress; }, [instance.progress]);
  useEffect(() => { instanceTargetRef.current = instance.target_count; }, [instance.target_count]);

  /* ─── Sync fillRef → fillDisplay for React rendering ─── */
  const syncFill = useCallback(() => {
    setFillDisplay(fillRef.current);
  }, []);

  /* ─── Main fill loop (ember ignition) ─── */
  const fillLoop = useCallback(() => {
    const elapsed = performance.now() - startTRef.current;
    const t = Math.min(elapsed / HOLD_MS, 1);
    fillRef.current = easeEmber(t);
    syncFill();

    if (t >= 1) {
      holdingRef.current = false;
      completedRef.current = true;
      setPhase('completing');
      setShowBurst(true);
      onCompleteRef.current?.(instanceIdRef.current, instanceTargetRef.current - instanceProgressRef.current);
      return;
    }

    if (holdingRef.current) {
      rafRef.current = requestAnimationFrame(fillLoopRef.current);
    }
  }, [syncFill]);

  /* ─── Recede animation on early release (linear over 200 ms) ─── */
  const recedeLoop = useCallback(() => {
    const elapsed = performance.now() - recedeStartRef.current;
    const t = Math.min(elapsed / RECEDE_MS, 1);
    fillRef.current = fromValueRef.current * (1 - t);
    syncFill();

    if (t < 1) {
      rafRef.current = requestAnimationFrame(recedeLoopRef.current);
    } else {
      fillRef.current = 0;
      syncFill();
      recedingRef.current = false;
      setPhase('idle');
    }
  }, [syncFill]);

  // Sync animation loop refs so callbacks can reference themselves recursively
  useEffect(() => { fillLoopRef.current = fillLoop; }, [fillLoop]);
  useEffect(() => { recedeLoopRef.current = recedeLoop; }, [recedeLoop]);

  /* ─── Tap (+1) ─── */
  const handleTap = useCallback(() => {
    if (phase === 'complete' || isCompleted) return;

    // Immediate visual response: show +1 float
    setShowFloat(true);
    setTimeout(() => setShowFloat(false), 600);

    // Optimistic: call onIncrement
    onIncrement?.(instance.id, 1);
  }, [phase, isCompleted, instance.id, onIncrement]);

  /* ─── Tap-to-undo a completed quest (Q-003) ───
   * A plain tap on a completed card reverts the completion. Reversible (hold to
   * re-complete) and the card is visually distinct, so accidental taps are
   * low-cost. delta = current progress so the server clamps progress back to 0. */
  const handleUndo = useCallback(() => {
    if (!(phase === 'complete' || isCompleted)) return;
    completedRef.current = false;
    fillRef.current = 0;
    setFillDisplay(0);
    setPhase('idle');
    onUncompleteRef.current?.(instanceIdRef.current, Math.max(instanceProgressRef.current, 1));
  }, [phase, isCompleted]);

  /* ─── Pointer handlers ─── */
  const handlePointerDown = useCallback(() => {
    if (phase === 'complete' || isCompleted) return;

    // Cancel any in-flight animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    holdingRef.current = true;
    completedRef.current = false;
    recedingRef.current = false;
    startTRef.current = performance.now();
    fillRef.current = 0;
    syncFill();
    setPhase('holding');
    rafRef.current = requestAnimationFrame(fillLoopRef.current);
  }, [phase, isCompleted, syncFill]);

  const handlePointerUp = useCallback(() => {
    // Only process if the pointer was actually held on this card
    if (!holdingRef.current) return;

    // Stop the fill loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    holdingRef.current = false;

    // If fill already reached full, completion is handled
    if (completedRef.current) return;

    const elapsed = performance.now() - startTRef.current;

    if (elapsed < TAP_MS) {
      // Quick tap (+1) — regardless of phase
      fillRef.current = 0;
      syncFill();
      setPhase('idle');
      handleTap();
    } else {
      // Released early → fill recedes (animated)
      fromValueRef.current = fillRef.current;
      recedeStartRef.current = performance.now();
      recedingRef.current = true;
      rafRef.current = requestAnimationFrame(recedeLoopRef.current);
    }
  }, [handleTap, syncFill]);

  const handlePointerLeave = useCallback(() => {
    // Only process if the pointer was held on this card
    if (!holdingRef.current) return;

    // Stop the fill loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    holdingRef.current = false;

    // If fill already reached full, completion is handled
    if (completedRef.current) return;

    // Sliding off → ALWAYS recede, NEVER tap
    const elapsed = performance.now() - startTRef.current;
    if (elapsed < TAP_MS || fillRef.current < 0.05) {
      // Barely started — snap reset
      fillRef.current = 0;
      syncFill();
      setPhase('idle');
    } else {
      // Fill has visible progress — animated recede
      fromValueRef.current = fillRef.current;
      recedeStartRef.current = performance.now();
      recedingRef.current = true;
      rafRef.current = requestAnimationFrame(recedeLoopRef.current);
    }
  }, [syncFill]);

  /* ─── After completion burst finishes ─── */
  const onBurstComplete = useCallback(() => {
    setPhase('complete');
    setFillDisplay(1);
    setShowBurst(false);
    setXpCountUp(optimisticXp ?? 0);
    setStreakCountUp(optimisticStreak ?? 0);
  }, [optimisticXp, optimisticStreak]);

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ─── Derived ─── */
  const displayProgress = phase === 'holding' || phase === 'completing'
    ? Math.max(progressPct, fillDisplay * 100)
    : phase === 'complete'
      ? 100
      : progressPct;

  const displayTitle = quest.title || 'Untitled';
  const displayUnit = quest.unit ?? '';
  const displayCount = `${instance.progress}/${instance.target_count}`;

  return (
    <motion.div
      className={
        'liquid-card relative overflow-hidden rounded-[20px]' +
        (isCompleted ? ' liquid-card--tint' : '')
      }
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        type: 'spring',
        ...springNudge,
        duration: base,
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={handleUndo}
      style={{
        touchAction: 'manipulation',
        cursor: 'pointer',
        userSelect: 'none',
        ['--tint' as string]: habitColor,
      }}
    >
      {/* ─── Leading habit-colour bar (4px) ─── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[20px]"
        style={{ backgroundColor: habitColor, opacity: isCompleted ? 0.5 : 1 }}
      />

      {/* ─── Ember Fill — radial gradient from left (design.html §6) ───
          Live ignition glow during a hold. When complete the tinted-glass
          card carries the colour, so the wash fades out (no muddy paint). */}
      <div
        className="absolute inset-0 rounded-[20px] origin-left pointer-events-none"
        style={{
          background: `radial-gradient(120% 140% at 12% 50%, ${accentColor}, ${habitColor})`,
          transform: `scaleX(${fillDisplay})`,
          opacity: phase === 'complete' ? 0 : 0.18,
          transition: 'none',
          zIndex: 1,
        }}
      />

      {/* ─── Completion burst flash ─── */}
      <AnimatePresence>
        {showBurst && (
          <motion.div
            className="absolute inset-0 rounded-[20px] pointer-events-none z-10"
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

        {/* ─── Tap-to-undo affordance (Q-003) ───
            Shown on completed cards once the burst settles, when the XP/streak
            pills aren't occupying the slot. Signals the card is tappable to
            undo; the whole 44px+ card is the hit target. */}
        {phase === 'complete' && isCompleted && !((optimisticXp ?? 0) > 0) && (
          <motion.div
            className="flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1"
            style={{ color: 'var(--color-ink-muted)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: base, ease, delay: 0.1 }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M6 4L2.5 7.5L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.5 7.5H10a3.5 3.5 0 0 1 0 7H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>
              Undo
            </span>
          </motion.div>
        )}

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
        <div className="absolute bottom-0 left-[4px] right-0 h-[3px] bg-line/40 rounded-br-[20px] overflow-hidden pointer-events-none">
          <motion.div
            className="h-full rounded-br-[20px]"
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
    </motion.div>
  );
}

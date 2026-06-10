/**
 * Domain library tests — verified against docs/05 §8 test vector
 *
 * The §8 spec:
 *   Habit "Run" (#E8743B). Weekly quest "Run" target 1, weekdays [mon,wed,fri].
 *   → generates 3 daily children (mon/wed/fri). On Wed 2026-06-10 the user
 *      taps the Wed child once:
 *   - instance `2026-06-10` progress 0→1, target 1 → completed.
 *   - streak for that child: if Mon's child completed → current 2 else 1.
 *   - XP: (10 + STREAK_BONUS(current)) * 1.0. With current=2 → 10 + 4 = 14 XP.
 */
import { describe, it, expect } from 'vitest';
import {
  periodKeyFor,
  nextPeriodKey,
  detectCadence,
  getISOWeek,
  computeXp,
  computeStreak,
  computeChildStreak,
  streakBonus,
} from '../index';

/* ─── Period keys (docs/05 §1) ─── */

describe('periodKeyFor', () => {
  it('returns correct daily key', () => {
    expect(periodKeyFor('daily', new Date(2026, 5, 7))).toBe('2026-06-07');
    expect(periodKeyFor('daily', new Date(2026, 5, 10))).toBe('2026-06-10');
  });

  it('returns correct weekly ISO key', () => {
    // 2026-01-01 is Thursday → ISO week 2026-W01
    expect(periodKeyFor('weekly', new Date(2026, 0, 1))).toBe('2026-W01');
    // 2026-06-08 is Monday → ISO week 2026-W24
    expect(periodKeyFor('weekly', new Date(2026, 5, 8))).toBe('2026-W24');
    // 2026-06-10 is Wednesday → still week 2026-W24
    expect(periodKeyFor('weekly', new Date(2026, 5, 10))).toBe('2026-W24');
  });

  it('returns correct monthly key', () => {
    expect(periodKeyFor('monthly', new Date(2026, 5, 1))).toBe('2026-06');
    expect(periodKeyFor('monthly', new Date(2026, 11, 15))).toBe('2026-12');
  });

  it('returns correct yearly key', () => {
    expect(periodKeyFor('yearly', new Date(2026, 0, 1))).toBe('2026');
    expect(periodKeyFor('yearly', new Date(2027, 11, 31))).toBe('2027');
  });
});

describe('getISOWeek', () => {
  it('returns 1 for 2026-01-01 (Thursday — week 1 of 2026)', () => {
    const r = getISOWeek(new Date(2026, 0, 1));
    expect(r.weekNumber).toBe(1);
    expect(r.weekYear).toBe(2026);
  });

  it('returns 24 for 2026-06-10 (Wednesday)', () => {
    expect(getISOWeek(new Date(2026, 5, 10)).weekNumber).toBe(24);
  });

  it('returns 23 for 2026-06-07 (Sunday — still week 23)', () => {
    expect(getISOWeek(new Date(2026, 5, 7)).weekNumber).toBe(23);
  });

  it('returns 24 for 2026-06-08 (Monday — week 24)', () => {
    expect(getISOWeek(new Date(2026, 5, 8)).weekNumber).toBe(24);
  });

  it('2024-12-30 (Mon) is ISO 2025-W01 (year boundary)', () => {
    const r = getISOWeek(new Date(2024, 11, 30));
    expect(r.weekNumber).toBe(1);
    expect(r.weekYear).toBe(2025);
  });

  it('2027-01-01 (Fri) is ISO 2026-W53 (year boundary)', () => {
    const r = getISOWeek(new Date(2027, 0, 1));
    expect(r.weekNumber).toBe(53);
    expect(r.weekYear).toBe(2026);
  });
});

describe('nextPeriodKey', () => {
  it('daily: 2026-06-10 → 2026-06-11', () => {
    expect(nextPeriodKey('2026-06-10', 'daily')).toBe('2026-06-11');
  });

  it('weekly: 2026-W23 → 2026-W24', () => {
    expect(nextPeriodKey('2026-W23', 'weekly')).toBe('2026-W24');
  });

  it('monthly: 2026-06 → 2026-07', () => {
    expect(nextPeriodKey('2026-06', 'monthly')).toBe('2026-07');
  });

  it('yearly: 2026 → 2027', () => {
    expect(nextPeriodKey('2026', 'yearly')).toBe('2027');
  });
});

describe('detectCadence', () => {
  it('detects daily from YYYY-MM-DD', () => {
    expect(detectCadence('2026-06-10')).toBe('daily');
  });
  it('detects weekly from YYYY-WNN', () => {
    expect(detectCadence('2026-W24')).toBe('weekly');
  });
  it('detects monthly from YYYY-MM', () => {
    expect(detectCadence('2026-06')).toBe('monthly');
  });
  it('detects yearly from YYYY', () => {
    expect(detectCadence('2026')).toBe('yearly');
  });
});

/* ─── XP computation (docs/05 §5) ─── */

describe('computeXp', () => {
  // §8 vector: streak=2, daily → 14
  it('§8 vector: streak=2, daily → 14', () => {
    expect(computeXp(2, 'daily')).toBe(14);
  });

  // §8 intermediate: streak=1, daily → 12
  it('streak=1, daily → 12', () => {
    expect(computeXp(1, 'daily')).toBe(12);
  });

  it('streak=0, daily → 10', () => {
    expect(computeXp(0, 'daily')).toBe(10);
  });

  it('streak=7 (max bonus), daily → 24', () => {
    // (10 + min(7,7)*2) * 1 = (10+14) = 24
    expect(computeXp(7, 'daily')).toBe(24);
  });

  it('streak=10 (capped at 7), daily → 24', () => {
    expect(computeXp(10, 'daily')).toBe(24);
  });

  it('cadence multiplier: weekly = 2x', () => {
    expect(computeXp(1, 'weekly')).toBe(24); // 12 * 2
  });

  it('cadence multiplier: monthly = 4x', () => {
    expect(computeXp(1, 'monthly')).toBe(48); // 12 * 4
  });

  it('cadence multiplier: yearly = 8x', () => {
    expect(computeXp(1, 'yearly')).toBe(96); // 12 * 8
  });
});

describe('streakBonus', () => {
  it('streak 2 → 4', () => expect(streakBonus(2)).toBe(4));
  it('streak 7 → 14', () => expect(streakBonus(7)).toBe(14));
  it('streak 0 → 0', () => expect(streakBonus(0)).toBe(0));
  it('streak 10 capped at 7 → 14', () => expect(streakBonus(10)).toBe(14));
});

/* ─── Streak computation (docs/05 §6) ─── */

describe('computeStreak', () => {
  it('first completion → current=1, longest=1', () => {
    const result = computeStreak(null, '2026-06-10', 'daily');
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.lastPeriodKey).toBe('2026-06-10');
  });

  it('consecutive daily: day 1 → day 2 → current=2', () => {
    const prev = { current: 1, longest: 1, lastPeriodKey: '2026-06-10' };
    const result = computeStreak(prev, '2026-06-11', 'daily');
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
    expect(result.lastPeriodKey).toBe('2026-06-11');
  });

  it('idempotent re-complete: same key → no change', () => {
    const prev = { current: 2, longest: 3, lastPeriodKey: '2026-06-11' };
    const result = computeStreak(prev, '2026-06-11', 'daily');
    expect(result.current).toBe(2);
    expect(result.longest).toBe(3);
  });

  it('gap: skip a day → reset to 1', () => {
    const prev = { current: 2, longest: 2, lastPeriodKey: '2026-06-10' };
    const result = computeStreak(prev, '2026-06-12', 'daily');
    expect(result.current).toBe(1);
    expect(result.longest).toBe(2); // preserved
  });

  it('consecutive weekly: W23 → W24', () => {
    const prev = { current: 1, longest: 1, lastPeriodKey: '2026-W23' };
    const result = computeStreak(prev, '2026-W24', 'weekly');
    expect(result.current).toBe(2);
  });

  it('gap weekly: skip W24 → reset', () => {
    const prev = { current: 3, longest: 3, lastPeriodKey: '2026-W23' };
    const result = computeStreak(prev, '2026-W25', 'weekly');
    expect(result.current).toBe(1);
  });

  it('consecutive monthly: 2026-06 → 2026-07', () => {
    const prev = { current: 1, longest: 1, lastPeriodKey: '2026-06' };
    const result = computeStreak(prev, '2026-07', 'monthly');
    expect(result.current).toBe(2);
  });

  it('consecutive yearly: 2026 → 2027', () => {
    const prev = { current: 1, longest: 1, lastPeriodKey: '2026' };
    const result = computeStreak(prev, '2027', 'yearly');
    expect(result.current).toBe(2);
  });
});

/* ─── §8 test vector (complete reproduction) ─── */

describe('§8 test vector', () => {
  // Weekly quest "Run" with weekdays [mon,wed,fri]
  // Generates 3 daily children
  // Mon child completes: 2026-06-08 → streak=1, XP=12
  // Wed child completes: 2026-06-10 → streak=2, XP=14

  it('reproduces §8 numbers exactly', () => {
    // Mon child completion (first ever for this quest)
    const monStreak = computeStreak(null, '2026-06-08', 'daily');
    expect(monStreak.current).toBe(1);
    expect(computeXp(monStreak.current, 'daily')).toBe(12);

    // Wed child completion — prev weekday (Mon) completed in same week
    const wedContext = {
      lastPeriodKey: '2026-06-08',
      current: 1,
      longest: 1,
    };
    const wedStreak = computeChildStreak(wedContext, '2026-06-10', '2026-06-08');
    expect(wedStreak.current).toBe(2);
    expect(computeXp(wedStreak.current, 'daily')).toBe(14);
  });
});

/* ─── Gap vector (docs/05 §6 gap → reset) ─── */

describe('gap vector', () => {
  // Mon-wk1 complete → skip wk2 → Wed-wk3 complete
  // Expected: streak=1, XP=12

  it('Mon-wk1 → skip wk2 → Wed-wk3 → streak=1, XP=12', () => {
    // Week 1: Mon completed
    const monStreak = computeStreak(null, '2026-06-01', 'daily');
    expect(monStreak.current).toBe(1);

    // Week 2: nothing (skip)
    // Week 3: Wed completed — previous weekday (Mon wk3) wasn't completed
    // Using computeChildStreak with prevWeekdayPeriodKey=null (Mon not completed)
    const prevState = { current: 1, longest: 1, lastPeriodKey: '2026-06-01' };
    const wedStreak = computeChildStreak(prevState, '2026-06-17', null);
    expect(wedStreak.current).toBe(1);
    expect(computeXp(wedStreak.current, 'daily')).toBe(12);
  });
});

/**
 * Period key utilities — Questline domain (docs/05 §1)
 *
 * Canonical period key format for each cadence:
 *   daily:   YYYY-MM-DD     (e.g. "2026-06-07")
 *   weekly:  YYYY-"W"IW     (e.g. "2026-W23")
 *   monthly: YYYY-MM         (e.g. "2026-06")
 *   yearly:  YYYY            (e.g. "2026")
 *
 * Weeks use ISO-8601 (Monday-start, week 1 contains first Thursday).
 * All functions are pure — no side effects, easy to test.
 */
import type { Cadence } from '@/lib/types';

/**
 * Return the period key for a given cadence and date.
 * An empty string returns the key for today.
 */
export function periodKeyFor(cadence: Cadence, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (cadence) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly': {
      // ISO week number
      const isoWeek = getISOWeek(date);
      return `${year}-W${String(isoWeek).padStart(2, '0')}`;
    }
    case 'monthly':
      return `${year}-${month}`;
    case 'yearly':
      return `${String(year)}`;
  }
}

/**
 * Compute the ISO week number and year for a date.
 * ISO-8601: week 1 contains the first Thursday of the year.
 * Returns { weekYear, weekNumber } where weekYear may differ from the date's year.
 */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday of same week
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the date of the Monday of an ISO week.
 */
export function mondayOfISOWeek(weekYear: number, weekNumber: number): Date {
  const simple = new Date(Date.UTC(weekYear, 0, 4)); // Jan 4 is always in week 1
  const dayNum = simple.getUTCDay() || 7;
  const mondayOfWeek1 = new Date(simple);
  mondayOfWeek1.setUTCDate(simple.getUTCDate() - dayNum + 1);
  const result = new Date(mondayOfWeek1);
  result.setUTCDate(mondayOfWeek1.getUTCDate() + (weekNumber - 1) * 7);
  return result;
}

/**
 * Compute the next period key after a given one for a cadence.
 * Used by idempotent-streak detection.
 */
export function nextPeriodKey(currentKey: string, cadence: Cadence): string {
  switch (cadence) {
    case 'daily': {
      const d = new Date(currentKey + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      return periodKeyFor('daily', d);
    }
    case 'weekly': {
      // currentKey is "YYYY-WNN"
      const match = currentKey.match(/^(\d{4})-W(\d{2})$/);
      if (!match) throw new Error(`Invalid weekly period key: ${currentKey}`);
      const weekYear = parseInt(match[1], 10);
      const weekNum = parseInt(match[2], 10);
      const monday = mondayOfISOWeek(weekYear, weekNum);
      monday.setDate(monday.getDate() + 7);
      return periodKeyFor('weekly', monday);
    }
    case 'monthly': {
      const [y, m] = currentKey.split('-').map(Number);
      const d = new Date(y, m - 1, 1); // month is 1-indexed in key, 0-indexed in Date
      d.setMonth(d.getMonth() + 1);
      return periodKeyFor('monthly', d);
    }
    case 'yearly': {
      const year = parseInt(currentKey, 10);
      return String(year + 1);
    }
  }
}

/**
 * Parse a period key to get the cadence it represents.
 */
export function detectCadence(periodKey: string): Cadence {
  if (/^\d{4}$/.test(periodKey)) return 'yearly';
  if (/^\d{4}-\d{2}$/.test(periodKey)) return 'monthly';
  if (/^\d{4}-W\d{2}$/i.test(periodKey)) return 'weekly';
  return 'daily';
}

/**
 * Get the ISO weekday index (1=Monday..7=Sunday) for a date.
 */
export function getISODay(date: Date): number {
  return date.getDay() || 7;
}

/**
 * Map weekday name to ISO weekday index.
 */
export function weekdayToIndex(wd: string): number {
  const map: Record<string, number> = {
    mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7,
  };
  return map[wd.toLowerCase()] ?? 0;
}

/**
 * Map ISO weekday index to weekday name.
 */
export function indexToWeekday(idx: number): string {
  const map: Record<number, string> = {
    1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun',
  };
  return map[idx] ?? '';
}

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
 * All ISO-week math uses UTC dates constructed from local components
 * so that `new Date(y, m, d)` arguments produce the expected result.
 */
import type { Cadence } from '@/lib/types';

/** Build a UTC noon Date from local year/month/day to avoid timezone drift. */
function utcNoon(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d, 12, 0, 0));
}
function utcNoonFromDate(date: Date): Date {
  return utcNoon(date.getFullYear(), date.getMonth(), date.getDate());
}

/* ─── Public API ─── */

/**
 * Return the period key for a given cadence and date.
 */
export function periodKeyFor(cadence: Cadence, date: Date = new Date()): string {
  switch (cadence) {
    case 'daily': {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    case 'weekly': {
      const u = utcNoonFromDate(date);
      const { weekYear, weekNumber } = getISOWeek(u);
      return `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;
    }
    case 'monthly': {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
    case 'yearly':
      return String(date.getFullYear());
  }
}

/**
 * Compute the ISO week-year and week number for a date.
 *
 * ISO-8601: weeks are Monday-to-Sunday, week 1 contains the first Thursday.
 * The week-year may differ from the calendar year.
 *
 * Accepts any Date (local or UTC) and normalises internally.
 *
 * Returns { weekYear, weekNumber }.
 */
export function getISOWeek(date: Date): { weekYear: number; weekNumber: number } {
  // Normalise to UTC noon from local components to avoid timezone day-shift
  const d = utcNoon(date.getFullYear(), date.getMonth(), date.getDate());

  // Move to Thursday of the same ISO week.
  // Thursday determines which week-year this week belongs to.
  const dow = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const weekYear = d.getUTCFullYear();

  // Jan 4 of the week-year is always in ISO week 1.
  const jan4 = new Date(Date.UTC(weekYear, 0, 4, 12, 0, 0));
  const jan4Dow = jan4.getUTCDay() || 7;
  // Monday of the week containing Jan 4 (this is day 1 of ISO week 1)
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1));

  // Find the Monday of the input date's ISO week.
  const inputDow = d.getUTCDay() || 7;
  const inputMonday = new Date(d);
  inputMonday.setUTCDate(d.getUTCDate() - (inputDow - 1));

  // Week number = how many weeks since week-1 Monday (+1).
  const msPerWeek = 7 * 86400 * 1000;
  const diff = inputMonday.getTime() - mondayWeek1.getTime();
  const weekNumber = Math.floor(diff / msPerWeek) + 1;

  return { weekYear, weekNumber };
}

/**
 * Compute the next period key after a given one for a cadence.
 */
export function nextPeriodKey(currentKey: string, cadence: Cadence): string {
  switch (cadence) {
    case 'daily': {
      const d = new Date(currentKey + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      return periodKeyFor('daily', new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    case 'weekly': {
      const match = currentKey.match(/^(\d{4})-W(\d{2})$/i);
      if (!match) throw new Error(`Invalid weekly period key: ${currentKey}`);
      const year = parseInt(match[1], 10);
      const weekNum = parseInt(match[2], 10);
      const monday = mondayOfISOWeek(year, weekNum);
      monday.setUTCDate(monday.getUTCDate() + 7);
      return periodKeyFor('weekly', new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
    }
    case 'monthly': {
      const [y, m] = currentKey.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
      d.setUTCMonth(d.getUTCMonth() + 1);
      return periodKeyFor('monthly', new Date(d.getUTCFullYear(), d.getUTCMonth()));
    }
    case 'yearly': {
      const year = parseInt(currentKey, 10);
      return String(year + 1);
    }
  }
}

/**
 * Get the Monday of an ISO week.
 */
export function mondayOfISOWeek(weekYear: number, weekNumber: number): Date {
  const jan4 = new Date(Date.UTC(weekYear, 0, 4, 12, 0, 0));
  const jan4Dow = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1));
  const result = new Date(mondayWeek1);
  result.setUTCDate(mondayWeek1.getUTCDate() + (weekNumber - 1) * 7);
  return result;
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
 * Get the ISO weekday index (1=Monday..7=Sunday) for a local date.
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

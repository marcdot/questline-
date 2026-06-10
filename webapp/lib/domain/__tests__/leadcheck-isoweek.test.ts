import { describe, it, expect } from 'vitest';
import { periodKeyFor } from '../period-keys';

describe('ISO week-year boundary (lead probe)', () => {
  it('2024-12-30 (Mon) is ISO 2025-W01', () => {
    expect(periodKeyFor('weekly', new Date(2024, 11, 30))).toBe('2025-W01');
  });
  it('2027-01-01 (Fri) is ISO 2026-W53', () => {
    expect(periodKeyFor('weekly', new Date(2027, 0, 1))).toBe('2026-W53');
  });
  it('mid-year sanity 2026-06-10 is 2026-W24', () => {
    expect(periodKeyFor('weekly', new Date(2026, 5, 10))).toBe('2026-W24');
  });
});

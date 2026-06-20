import { describe, it, expect } from 'vitest';
import { walkCalories, isWalkQuest } from '../calories';

describe('walkCalories', () => {
  it('matches the ticket reference example (70kg, brisk, 45min ≈ 226 kcal)', () => {
    expect(walkCalories(70, 45, 'brisk')).toBe(226);
  });

  it('defaults to moderate pace', () => {
    // 3.5 × 70 × 0.5 = 122.5 → 123
    expect(walkCalories(70, 30)).toBe(123);
  });

  it('returns 0 for missing/invalid weight or duration', () => {
    expect(walkCalories(null, 30)).toBe(0);
    expect(walkCalories(70, 0)).toBe(0);
    expect(walkCalories(0, 30)).toBe(0);
    expect(walkCalories(undefined, undefined)).toBe(0);
  });
});

describe('isWalkQuest', () => {
  it('detects walk in title or habit name', () => {
    expect(isWalkQuest('Morning walk')).toBe(true);
    expect(isWalkQuest('30 min', 'Walking')).toBe(true);
    expect(isWalkQuest('Walked the dog')).toBe(true);
  });

  it('does not match unrelated quests', () => {
    expect(isWalkQuest('Read 20 pages', 'Reading')).toBe(false);
    expect(isWalkQuest('Run 5 km', 'Running')).toBe(false);
  });
});

package com.questline.app.domain

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Tests for StreakCalculator per docs/05 §6 + §8.
 *
 * §8 test vector:
 * - Mon 2026-06-08 complete → Wed-child streak: current=2 (if Mon completed else 1)
 * - Gap vector: Mon-wk1 → skip → Wed-wk3 → streak=1
 */
class StreakCalculatorTest {

    private val parentWeekdays = listOf("mon", "wed", "fri")

    // ── Standard streak (non-child) ──

    @Test
    fun `first completion sets streak to 1`() {
        val result = StreakCalculator.computeStreak(
            prevStreak = StreakState(0, 0, null),
            newPeriodKey = "2026-06-08",
            questCadence = "daily"
        )
        assertEquals(1, result.current)
        assertEquals(1, result.longest)
        assertEquals("2026-06-08", result.lastPeriodKey)
    }

    @Test
    fun `consecutive daily increments streak`() {
        val prev = StreakState(1, 1, "2026-06-08")
        val result = StreakCalculator.computeStreak(
            prevStreak = prev,
            newPeriodKey = "2026-06-09",
            questCadence = "daily"
        )
        assertEquals(2, result.current)
        assertEquals(2, result.longest)
    }

    @Test
    fun `gap in daily resets streak to 1`() {
        val prev = StreakState(1, 1, "2026-06-08")
        val result = StreakCalculator.computeStreak(
            prevStreak = prev,
            newPeriodKey = "2026-06-10",
            questCadence = "daily"
        )
        assertEquals(1, result.current)
        assertEquals(1, result.longest) // longest stays 1
    }

    @Test
    fun `idempotent re-complete same period key does not change streak`() {
        val prev = StreakState(1, 2, "2026-06-08")
        val result = StreakCalculator.computeStreak(
            prevStreak = prev,
            newPeriodKey = "2026-06-08",
            questCadence = "daily"
        )
        assertEquals(1, result.current) // same period key → unchanged
        assertEquals(2, result.longest) // longest preserved
    }

    // ── §8 test vector: weekly parent with [mon,wed,fri] children ──

    @Test
    fun `docs05_s8_mon_complete_then_wed_streak_is_2`() {
        // Step 1: Mon completion (first ever)
        val monResult = StreakCalculator.computeStreak(
            prevStreak = StreakState(0, 0, null),
            newPeriodKey = "2026-06-08", // Monday
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )
        assertEquals(1, monResult.current)
        assertEquals(1, monResult.longest)
        assertEquals("2026-06-08", monResult.lastPeriodKey)

        // Step 2: Wed completion (same week, next weekday in schedule)
        val wedResult = StreakCalculator.computeStreak(
            prevStreak = monResult,
            newPeriodKey = "2026-06-10", // Wednesday
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )
        assertEquals(2, wedResult.current, "Wed completion should give streak 2 when Mon was completed")
        assertEquals(2, wedResult.longest)
        assertEquals("2026-06-10", wedResult.lastPeriodKey)
    }

    @Test
    fun `docs05_s8_complete_wed_without_mon_streak_is_1`() {
        // If Mon's child was NOT completed, Wed should be streak 1
        val result = StreakCalculator.computeStreak(
            prevStreak = StreakState(0, 0, null),
            newPeriodKey = "2026-06-10", // Wednesday, no prior completions
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )
        assertEquals(1, result.current)
    }

    @Test
    fun `gap_vector_monday_wk1_to_wednesday_wk3_streak_is_1`() {
        // Mon-wk1 (2026-06-08) → skip → Wed-wk3 (2026-06-24, week 26)
        // Mon completion first
        val monResult = StreakCalculator.computeStreak(
            prevStreak = StreakState(0, 0, null),
            newPeriodKey = "2026-06-08",
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )

        // Wed completion 2 weeks later (week 26)
        val wedResult = StreakCalculator.computeStreak(
            prevStreak = monResult,
            newPeriodKey = "2026-06-24", // Wednesday of ISO week 26
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )
        assertEquals(1, wedResult.current, "Gap vector: streak should reset to 1")
        assertEquals(1, wedResult.longest) // longest preserved from mon's 1
        assertEquals("2026-06-24", wedResult.lastPeriodKey)
    }

    // ── Child streak: next week wraparound ──

    @Test
    fun `child_streak_next_week_first_weekday_continues_streak`() {
        // Week 24: Fri (last weekday) completed → streak 1
        val friResult = StreakCalculator.computeStreak(
            prevStreak = StreakState(0, 0, null),
            newPeriodKey = "2026-06-12", // Friday of week 24
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )
        assertEquals(1, friResult.current)

        // Week 25: Mon (first weekday, next week) → should be streak 2
        val monResult = StreakCalculator.computeStreak(
            prevStreak = friResult,
            newPeriodKey = "2026-06-15", // Monday of week 25
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )
        assertEquals(2, monResult.current, "Next-week first weekday should continue streak")
        assertEquals(2, monResult.longest)
    }

    @Test
    fun `child_streak_skipping_a_weekday_in_same_week_resets`() {
        // Mon completed → Fri completed (skipping Wed) → break
        val monResult = StreakCalculator.computeStreak(
            prevStreak = StreakState(0, 0, null),
            newPeriodKey = "2026-06-08", // Monday
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )

        // Fri, same week, skipping Wed
        val friResult = StreakCalculator.computeStreak(
            prevStreak = monResult,
            newPeriodKey = "2026-06-12", // Friday, same week
            questCadence = "daily",
            parentWeekdays = parentWeekdays
        )
        assertEquals(1, friResult.current, "Skipping Wed in schedule should reset streak")
    }

    // ── Standard weekly streak ──

    @Test
    fun `standard_weekly_consecutive_weeks_increment_streak`() {
        val prev = StreakState(1, 1, "2026-W24")
        val result = StreakCalculator.computeStreak(
            prevStreak = prev,
            newPeriodKey = "2026-W25",
            questCadence = "weekly"
        )
        assertEquals(2, result.current)
    }

    @Test
    fun `standard_weekly_gap_resets_streak`() {
        val prev = StreakState(1, 1, "2026-W24")
        val result = StreakCalculator.computeStreak(
            prevStreak = prev,
            newPeriodKey = "2026-W26",
            questCadence = "weekly"
        )
        assertEquals(1, result.current)
    }

    @Test
    fun `longest_is_preserved_across_resets`() {
        // Build up to streak 3, then break
        val s1 = StreakCalculator.computeStreak(
            StreakState(0, 0, null), "2026-W24", "weekly"
        )
        val s2 = StreakCalculator.computeStreak(
            s1, "2026-W25", "weekly"
        )
        val s3 = StreakCalculator.computeStreak(
            s2, "2026-W26", "weekly"
        )
        assertEquals(3, s3.current)
        assertEquals(3, s3.longest)

        // Gap
        val s4 = StreakCalculator.computeStreak(
            s3, "2026-W28", "weekly"
        )
        assertEquals(1, s4.current)
        assertEquals(3, s4.longest, "Longest should be preserved as 3")
    }
}

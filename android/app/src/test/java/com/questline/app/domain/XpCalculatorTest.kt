package com.questline.app.domain

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Tests for XpCalculator per docs/05 §5.
 *
 * Key test vectors:
 * - §8: Mon→Wed → current=2 → XP = round((10 + 4) * 1.0) = 14
 * - Gap: streak=1 → XP = round((10 + 2) * 1.0) = 12
 * - Cadence multipliers
 */
class XpCalculatorTest {

    @Test
    fun `base complete XP is 10`() {
        assertEquals(10, XpCalculator.BASE_COMPLETE)
    }

    @Test
    fun `streak bonus for 0 is 0`() {
        assertEquals(0, XpCalculator.streakBonus(0))
    }

    @Test
    fun `streak bonus for 1 is 2`() {
        assertEquals(2, XpCalculator.streakBonus(1))
    }

    @Test
    fun `streak bonus for 2 is 4`() {
        assertEquals(4, XpCalculator.streakBonus(2))
    }

    @Test
    fun `streak bonus for 7 is 14`() {
        assertEquals(14, XpCalculator.streakBonus(7))
    }

    @Test
    fun `streak bonus for 10 is capped at 14`() {
        assertEquals(14, XpCalculator.streakBonus(10))
    }

    @Test
    fun `cadence multiplier for daily is 1_0`() {
        assertEquals(1.0, XpCalculator.cadenceMultiplier("daily"))
    }

    @Test
    fun `cadence multiplier for weekly is 2_0`() {
        assertEquals(2.0, XpCalculator.cadenceMultiplier("weekly"))
    }

    @Test
    fun `cadence multiplier for monthly is 4_0`() {
        assertEquals(4.0, XpCalculator.cadenceMultiplier("monthly"))
    }

    @Test
    fun `cadence multiplier for yearly is 8_0`() {
        assertEquals(8.0, XpCalculator.cadenceMultiplier("yearly"))
    }

    // ── §8 test vector ──

    @Test
    fun `docs05_s8_exact_numbers streak=2 daily gives 14 XP`() {
        // §8: current=2 → STREAK_BONUS(2) = 4
        // XP = round((10 + 4) * 1.0) = 14
        assertEquals(14, XpCalculator.calculateXp(streak = 2, cadence = "daily"))
    }

    @Test
    fun `docs05_s8_exact_numbers streak=2 weekly gives 28 XP`() {
        // XP = round((10 + 4) * 2.0) = 28
        assertEquals(28, XpCalculator.calculateXp(streak = 2, cadence = "weekly"))
    }

    @Test
    fun `docs05_s8_exact_numbers streak=2 monthly gives 56 XP`() {
        // XP = round((10 + 4) * 4.0) = 56
        assertEquals(56, XpCalculator.calculateXp(streak = 2, cadence = "monthly"))
    }

    @Test
    fun `docs05_s8_exact_numbers streak=2 yearly gives 112 XP`() {
        // XP = round((10 + 4) * 8.0) = 112
        assertEquals(112, XpCalculator.calculateXp(streak = 2, cadence = "yearly"))
    }

    // ── Gap vector ──

    @Test
    fun `gap_vector streak=1 daily gives 12 XP`() {
        // Streak 1 → STREAK_BONUS(1) = 2
        // XP = round((10 + 2) * 1.0) = 12
        assertEquals(12, XpCalculator.calculateXp(streak = 1, cadence = "daily"))
    }

    // ── Edge cases ──

    @Test
    fun `streak=0 daily gives 10 XP`() {
        assertEquals(10, XpCalculator.calculateXp(streak = 0, cadence = "daily"))
    }

    @Test
    fun `level formula floor sqrt balance50 plus 1`() {
        // Level formula: level = floor(sqrt(balance / 50)) + 1
        assertEquals(1, XpCalculator.levelForXp(0))
        assertEquals(1, XpCalculator.levelForXp(49))
        assertEquals(2, XpCalculator.levelForXp(50))
        assertEquals(2, XpCalculator.levelForXp(199))
        assertEquals(3, XpCalculator.levelForXp(200))
        assertEquals(10, XpCalculator.levelForXp(50 * 81)) // sqrt(81) = 9 → level 10
    }
}

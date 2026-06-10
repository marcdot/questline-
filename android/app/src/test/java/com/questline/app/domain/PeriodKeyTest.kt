package com.questline.app.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import java.time.LocalDate

/**
 * Tests for PeriodKey per docs/05 §1.
 * Verifies ISO-8601 week math including edge cases.
 *
 * Critical test cases from docs/08 §1:
 * - 2026-01-01 → 2026-W01
 * - 2026-06-07 → 2026-W23
 * - 2024-12-30 → 2025-W01 (ISO week-year differs from calendar year)
 * - 2027-01-01 → 2026-W53 (ISO week-year differs from calendar year)
 */
class PeriodKeyTest {

    @Test
    fun `daily key for 2026-06-07 is 2026-06-07`() {
        assertEquals("2026-06-07", PeriodKey.daily(LocalDate.of(2026, 6, 7)))
    }

    @Test
    fun `daily key for 2026-01-01 is 2026-01-01`() {
        assertEquals("2026-01-01", PeriodKey.daily(LocalDate.of(2026, 1, 1)))
    }

    @Test
    fun `weekly key for 2026-06-07 is 2026-W23`() {
        // 2026-06-07 is a Sunday, ISO week 23
        assertEquals("2026-W23", PeriodKey.weekly(LocalDate.of(2026, 6, 7)))
    }

    @Test
    fun `weekly key for 2026-06-08 Monday is 2026-W24`() {
        assertEquals("2026-W24", PeriodKey.weekly(LocalDate.of(2026, 6, 8)))
    }

    @Test
    fun `weekly key for 2026-01-01 is 2026-W01`() {
        // Jan 1, 2026 is a Thursday — week 1 of ISO year 2026
        assertEquals("2026-W01", PeriodKey.weekly(LocalDate.of(2026, 1, 1)))
    }

    @Test
    fun `2024-12-30 is Monday of ISO week 2025-W01`() {
        // Dec 30, 2024 is a Monday. It's in ISO week 1 of 2025
        assertEquals("2025-W01", PeriodKey.weekly(LocalDate.of(2024, 12, 30)))
    }

    @Test
    fun `2027-01-01 is Friday of ISO week 2026-W53`() {
        // Jan 1, 2027 is a Friday. It belongs to ISO week 53 of 2026
        assertEquals("2026-W53", PeriodKey.weekly(LocalDate.of(2027, 1, 1)))
    }

    @Test
    fun `2024-12-31 is Tuesday of ISO week 2025-W01`() {
        assertEquals("2025-W01", PeriodKey.weekly(LocalDate.of(2024, 12, 31)))
    }

    @Test
    fun `2025-01-01 is Wednesday of ISO week 2025-W01`() {
        assertEquals("2025-W01", PeriodKey.weekly(LocalDate.of(2025, 1, 1)))
    }

    @Test
    fun `monthly key for 2026-06 is 2026-06`() {
        assertEquals("2026-06", PeriodKey.monthly(LocalDate.of(2026, 6, 15)))
    }

    @Test
    fun `yearly key for 2026 is 2026`() {
        assertEquals("2026", PeriodKey.yearly(LocalDate.of(2026, 5, 1)))
    }

    @Test
    fun `next daily period after 2026-06-07 is 2026-06-08`() {
        assertEquals("2026-06-08", PeriodKey.next("2026-06-07", "daily"))
    }

    @Test
    fun `next weekly period after 2026-W23 is 2026-W24`() {
        assertEquals("2026-W24", PeriodKey.next("2026-W23", "weekly"))
    }

    @Test
    fun `next weekly crosses ISO year boundary`() {
        // 2025-W01 is the week starting 2024-12-29 (Monday)
        // Next week should be 2025-W02
        assertEquals("2025-W02", PeriodKey.next("2025-W01", "weekly"))
    }

    @Test
    fun `next monthly after 2026-12 is 2027-01`() {
        assertEquals("2027-01", PeriodKey.next("2026-12", "monthly"))
    }

    @Test
    fun `next yearly after 2026 is 2027`() {
        assertEquals("2027", PeriodKey.next("2026", "yearly"))
    }

    @Test
    fun `isNext returns true for consecutive daily periods`() {
        assertEquals(true, PeriodKey.isNext("2026-06-07", "2026-06-08", "daily"))
    }

    @Test
    fun `isNext returns false for non-consecutive periods`() {
        assertEquals(false, PeriodKey.isNext("2026-06-07", "2026-06-10", "daily"))
    }
}

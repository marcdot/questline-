package com.questline.app.domain

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.IsoFields

/**
 * Period key generation per docs/05 §1.
 *
 * | cadence | key format        | example                    |
 * |---------|-------------------|----------------------------|
 * | daily   | YYYY-MM-DD        | 2026-06-07                 |
 * | weekly  | YYYY-"W"WW (ISO)  | 2026-W23                   |
 * | monthly | YYYY-MM           | 2026-06                    |
 * | yearly  | YYYY              | 2026                       |
 *
 * Weeks are ISO-8601 (Monday-start, week 1 contains the first Thursday).
 * For weekly keys, the year MUST be the ISO week-based year, not the calendar year.
 * Test case: 2024-12-30 → 2025-W01, 2027-01-01 → 2026-W53
 */
object PeriodKey {

    fun daily(date: LocalDate): String = date.toString() // YYYY-MM-DD

    fun weekly(date: LocalDate): String {
        val weekYear = date.get(IsoFields.WEEK_BASED_YEAR)
        val week = date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
        return String.format("%04d-W%02d", weekYear, week)
    }

    fun monthly(date: LocalDate): String {
        return String.format("%04d-%02d", date.year, date.monthValue)
    }

    fun yearly(date: LocalDate): String {
        return date.year.toString()
    }

    /**
     * Returns the period key for the period containing [date] for the given [cadence].
     */
    fun forDate(date: LocalDate, cadence: String): String = when (cadence) {
        "daily" -> daily(date)
        "weekly" -> weekly(date)
        "monthly" -> monthly(date)
        "yearly" -> yearly(date)
        else -> throw IllegalArgumentException("Unknown cadence: $cadence")
    }

    /**
     * Returns the period key for the next period after [key] for the given [cadence].
     */
    fun next(key: String, cadence: String): String {
        return when (cadence) {
            "daily" -> daily(LocalDate.parse(key).plusDays(1))
            "weekly" -> {
                val (year, week) = parseWeeklyKey(key)
                val firstDayOfWeek = getFirstDayOfIsoWeek(year, week)
                weekly(firstDayOfWeek.plusWeeks(1))
            }
            "monthly" -> {
                val parts = key.split("-")
                val date = LocalDate.of(parts[0].toInt(), parts[1].toInt(), 1).plusMonths(1)
                monthly(date)
            }
            "yearly" -> (key.toInt() + 1).toString()
            else -> throw IllegalArgumentException("Unknown cadence: $cadence")
        }
    }

    /**
     * Returns true if [current] is the period immediately after [last] for the given [cadence].
     */
    fun isNext(last: String, current: String, cadence: String): Boolean {
        return next(last, cadence) == current
    }

    /**
     * Parses a weekly key like "2026-W23" into (weekBasedYear, weekNumber).
     */
    fun parseWeeklyKey(key: String): Pair<Int, Int> {
        val regex = Regex("""(\d{4})-W(\d{2})""")
        val match = regex.find(key) ?: throw IllegalArgumentException("Invalid weekly key: $key")
        return match.groupValues[1].toInt() to match.groupValues[2].toInt()
    }

    /**
     * Gets the Monday of an ISO week.
     */
    private fun getFirstDayOfIsoWeek(weekYear: Int, week: Int): LocalDate {
        // Use the first Thursday of the ISO year, then go back to Monday
        val firstJan = LocalDate.of(weekYear, 1, 4) // Jan 4 is always in ISO week 1
        val firstWeek = firstJan.with(IsoFields.WEEK_OF_WEEK_BASED_YEAR, 1L)
        val firstMonday = firstWeek.with(java.time.DayOfWeek.MONDAY)
        return firstMonday.plusWeeks((week - 1).toLong())
    }
}

package com.questline.app.domain

import java.time.LocalDate
import java.time.temporal.IsoFields

/**
 * Streak calculation per docs/05 §6.
 *
 * A streak counts consecutive completed periods for a quest.
 *
 * For daily children of a weekly parent (generated quests), streaks track consecutive
 * completions across the parent's ordered weekdays schedule.
 */
data class StreakState(
    val current: Int,
    val longest: Int,
    val lastPeriodKey: String?
)

object StreakCalculator {

    /**
     * Compute the new streak state when an instance completes.
     *
     * @param prevStreak previous streak state (current, longest, last_period_key)
     * @param newPeriodKey the period_key of the completing instance
     * @param questCadence the quest's cadence (daily, weekly, monthly, yearly)
     * @param parentWeekdays if this quest is a daily child of a weekly parent,
     *                       the parent's ordered weekday keys (["mon","wed","fri"])
     * @return new StreakState
     */
    fun computeStreak(
        prevStreak: StreakState,
        newPeriodKey: String,
        questCadence: String,
        parentWeekdays: List<String>? = null
    ): StreakState {
        val isChildOfWeekly = parentWeekdays != null && parentWeekdays.isNotEmpty()
                && questCadence == "daily"

        return if (isChildOfWeekly) {
            computeChildStreak(prevStreak, newPeriodKey, parentWeekdays!!)
        } else {
            computeStandardStreak(prevStreak, newPeriodKey, questCadence)
        }
    }

    /**
     * Standard streak logic per docs/05 §6:
     * - If p is immediately after last_period_key: current++
     * - If p == last_period_key (idempotent): no change
     * - Else (gap): current = 1
     */
    private fun computeStandardStreak(
        prev: StreakState,
        newPeriodKey: String,
        cadence: String
    ): StreakState {
        val lastKey = prev.lastPeriodKey

        if (lastKey == null) {
            val newCurrent = 1
            return StreakState(newCurrent, maxOf(prev.longest, newCurrent), newPeriodKey)
        }

        if (newPeriodKey == lastKey) {
            // Idempotent re-complete: no change
            return prev.copy(lastPeriodKey = newPeriodKey)
        }

        val isConsecutive = PeriodKey.isNext(lastKey, newPeriodKey, cadence)
        val newCurrent = if (isConsecutive) prev.current + 1 else 1
        return StreakState(newCurrent, maxOf(prev.longest, newCurrent), newPeriodKey)
    }

    /**
     * Streak logic for daily children of a weekly parent.
     *
     * Streak counts consecutive completions across the parent's ordered weekday schedule.
     * - Same week: if this completion's weekday is the next in the schedule → streak++
     * - Next week: if this completion is the first weekday in schedule → streak++
     * - Gap (multiple weeks or skipped weekday): streak = 1
     */
    private fun computeChildStreak(
        prev: StreakState,
        newPeriodKey: String,
        parentWeekdays: List<String>
    ): StreakState {
        val newDate = LocalDate.parse(newPeriodKey)
        val newWeekdayKey = dateToWeekdayKey(newDate.dayOfWeek)
        val newWeek = newDate.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
        val newWeekYear = newDate.get(IsoFields.WEEK_BASED_YEAR)
        val newIndex = parentWeekdays.indexOf(newWeekdayKey)

        if (newIndex < 0) {
            // This weekday isn't in the parent schedule — fallback to standard streak
            return computeStandardStreak(prev, newPeriodKey, "daily")
        }

        if (prev.lastPeriodKey == null) {
            val newCurrent = 1
            return StreakState(newCurrent, maxOf(prev.longest, newCurrent), newPeriodKey)
        }

        if (newPeriodKey == prev.lastPeriodKey) {
            return prev.copy(lastPeriodKey = newPeriodKey)
        }

        val lastDate = LocalDate.parse(prev.lastPeriodKey)
        val lastWeekdayKey = dateToWeekdayKey(lastDate.dayOfWeek)
        val lastIndex = parentWeekdays.indexOf(lastWeekdayKey)
        val lastWeek = lastDate.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
        val lastWeekYear = lastDate.get(IsoFields.WEEK_BASED_YEAR)

        val isSameWeek = newWeekYear == lastWeekYear && newWeek == lastWeek
        val isNextWeek = isConsecutiveWeek(newWeekYear, newWeek, lastWeekYear, lastWeek)

        val isConsecutive = if (isSameWeek) {
            // Same week: the new weekday must be the next in schedule order
            newIndex == lastIndex + 1
        } else if (isNextWeek) {
            // Next week: the new weekday must be the first in the schedule
            newIndex == 0 && lastIndex == parentWeekdays.lastIndex
        } else {
            false
        }

        val newCurrent = if (isConsecutive) prev.current + 1 else 1
        return StreakState(newCurrent, maxOf(prev.longest, newCurrent), newPeriodKey)
    }

    private fun dateToWeekdayKey(dayOfWeek: java.time.DayOfWeek): String {
        return when (dayOfWeek) {
            java.time.DayOfWeek.MONDAY -> "mon"
            java.time.DayOfWeek.TUESDAY -> "tue"
            java.time.DayOfWeek.WEDNESDAY -> "wed"
            java.time.DayOfWeek.THURSDAY -> "thu"
            java.time.DayOfWeek.FRIDAY -> "fri"
            java.time.DayOfWeek.SATURDAY -> "sat"
            java.time.DayOfWeek.SUNDAY -> "sun"
        }
    }

    /**
     * Check if (weekYear2, week2) is the ISO week immediately after (weekYear1, week1).
     */
    private fun isConsecutiveWeek(weekYear2: Int, week2: Int, weekYear1: Int, week1: Int): Boolean {
        return if (weekYear1 == weekYear2) {
            week2 == week1 + 1
        } else if (weekYear2 == weekYear1 + 1) {
            week1 == maxWeeksInYear(weekYear1) && week2 == 1
        } else {
            false
        }
    }

    /**
     * Max ISO weeks in a given year (52 or 53).
     */
    private fun maxWeeksInYear(year: Int): Int {
        val dec31 = LocalDate.of(year, 12, 31)
        return dec31.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
    }
}

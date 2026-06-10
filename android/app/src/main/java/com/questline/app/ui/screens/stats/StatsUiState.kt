package com.questline.app.ui.screens.stats

/**
 * Period filter for the Stats screen.
 */
enum class StatsPeriod(val label: String) {
    DAY("Day"),
    WEEK("Week"),
    MONTH("Month"),
    YEAR("Year"),
}

/**
 * UI state for the stats screen.
 */
data class StatsUiState(
    val isLoading: Boolean = true,
    val errorMessage: String? = null,

    // ── Filters ──
    val selectedPeriod: StatsPeriod = StatsPeriod.WEEK,
    val habits: List<HabitStatItem> = emptyList(),
    val selectedHabitId: String? = null, // null = All

    // ── XP graph ──
    val xpDataPoints: List<XpDataPoint> = emptyList(),
    val xpTotalForPeriod: Int = 0,

    // ── Streaks ──
    val habitStreaks: List<HabitStreakDisplay> = emptyList(),

    // ── Status grid ──
    val statusGrid: List<StatusGridRow> = emptyList(),

    // ── Sleep heatmap ──
    val sleepData: List<SleepDay> = emptyList(),
)

data class HabitStatItem(
    val id: String,
    val name: String,
    val colorArgb: Int,
)

data class XpDataPoint(
    val label: String,  // e.g. "Mon", "Jun 5", "Week 23", "June"
    val xp: Int,
)

data class HabitStreakDisplay(
    val habitName: String,
    val colorArgb: Int,
    val currentStreak: Int,
    val longestStreak: Int,
    val questName: String,
)

data class StatusGridRow(
    val habitName: String,
    val colorArgb: Int,
    val periods: List<PeriodCompletion>,
)

data class PeriodCompletion(
    val label: String, // e.g. "Mon", "Jun 5"
    val completed: Boolean,
    val partial: Boolean = false, // partially completed (progress > 0 but not done)
)

data class SleepDay(
    val label: String,   // e.g. "Mon 1", "Jun 5"
    val hours: Float,
    val nightOf: String,
)

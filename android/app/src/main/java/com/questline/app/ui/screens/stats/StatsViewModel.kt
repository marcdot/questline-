package com.questline.app.ui.screens.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.questline.app.data.remote.SupabaseRemoteSource
import com.questline.app.data.repo.AuthRepository
import com.questline.app.domain.PeriodKey
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.IsoFields
import java.util.Locale
import javax.inject.Inject

/**
 * ViewModel for the Stats screen — loads XP history, streaks, status grid,
 * and sleep data filtered by period + habit.
 */
@HiltViewModel
class StatsViewModel @Inject constructor(
    private val remoteSource: SupabaseRemoteSource,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(StatsUiState())
    val uiState: StateFlow<StatsUiState> = _uiState.asStateFlow()

    init {
        loadStats()
    }

    fun loadStats() {
        viewModelScope.launch {
            val userId = authRepository.cachedUserId ?: run {
                _uiState.update { it.copy(isLoading = false, errorMessage = "Not signed in") }
                return@launch
            }

            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            try {
                val period = _uiState.value.selectedPeriod
                val selectedHabitId = _uiState.value.selectedHabitId
                val today = LocalDate.now()

                // Load base data (habits, quests, streaks)
                val allHabits = remoteSource.getHabits(userId)
                val allQuests = remoteSource.getQuests(userId)
                val allStreaks = remoteSource.getStreaks(userId)

                // Build habit filter items
                val habitItems = allHabits.map { habit ->
                    HabitStatItem(
                        id = habit.id,
                        name = habit.name,
                        colorArgb = try {
                            android.graphics.Color.parseColor(habit.color)
                        } catch (_: Exception) {
                            android.graphics.Color.GRAY
                        },
                    )
                }

                // Filter quests by selected habit
                val filteredQuests = if (selectedHabitId != null) {
                    allQuests.filter { it.habitId == selectedHabitId }
                } else {
                    allQuests
                }

                // Determine date range for the selected period
                val (periodKeyStart, periodKeyEnd, dayLabels) = getPeriodRange(today, period)

                // Load instances for the range
                val instances = remoteSource.getInstancesForRange(userId, periodKeyStart, periodKeyEnd)

                // Load XP events for the range
                val dateStart = when (period) {
                    StatsPeriod.DAY -> today.toString()
                    StatsPeriod.WEEK -> today.with(DayOfWeek.MONDAY).toString()
                    StatsPeriod.MONTH -> today.withDayOfMonth(1).toString()
                    StatsPeriod.YEAR -> today.withDayOfYear(1).toString()
                }
                val dateEnd = today.plusDays(1).toString() // include today
                val xpEvents = remoteSource.getXpEventsForRange(userId, dateStart, dateEnd)

                // Build XP data points
                val xpDataPoints = buildXpDataPoints(xpEvents, today, period)

                // Build habit streaks display
                val habitStreaks = buildHabitStreaks(allStreaks, allQuests, allHabits, selectedHabitId)

                // Build status grid
                val statusGrid = buildStatusGrid(filteredQuests, instances, allHabits, today, period, dayLabels)

                // Load sleep data for current month
                val monthKey = PeriodKey.monthly(today)
                val sleepLogs = remoteSource.getSleepLogs(userId, monthKey)
                val sleepData = sleepLogs.map { log ->
                    SleepDay(
                        label = formatDateLabel(log.nightOf),
                        hours = log.hours.toFloat(),
                        nightOf = log.nightOf,
                    )
                }

                val xpTotal = xpEvents.sumOf { it.amount }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        habits = habitItems,
                        xpDataPoints = xpDataPoints,
                        xpTotalForPeriod = xpTotal,
                        habitStreaks = habitStreaks,
                        statusGrid = statusGrid,
                        sleepData = sleepData,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Failed to load stats")
                }
            }
        }
    }

    fun onPeriodChange(period: StatsPeriod) {
        _uiState.update { it.copy(selectedPeriod = period) }
        loadStats()
    }

    fun onHabitFilterChange(habitId: String?) {
        _uiState.update { it.copy(selectedHabitId = habitId) }
        loadStats()
    }

    // ── Period helpers ──

    private fun getPeriodRange(today: LocalDate, period: StatsPeriod): Triple<String, String, List<String>> {
        return when (period) {
            StatsPeriod.DAY -> {
                val key = PeriodKey.daily(today)
                Triple(key, key, listOf(formatDayLabel(today)))
            }
            StatsPeriod.WEEK -> {
                val monday = today.with(DayOfWeek.MONDAY)
                val sunday = monday.plusDays(6)
                val startKey = PeriodKey.daily(monday)
                val endKey = PeriodKey.daily(sunday)
                val labels = (0..6).map { formatDayLabel(monday.plusDays(it.toLong())) }
                Triple(startKey, endKey, labels)
            }
            StatsPeriod.MONTH -> {
                val start = today.withDayOfMonth(1)
                val end = today.withDayOfMonth(today.lengthOfMonth())
                val startKey = PeriodKey.daily(start)
                val endKey = PeriodKey.daily(end)
                val labels = (1..today.lengthOfMonth()).map { day ->
                    formatDayLabel(today.withDayOfMonth(day))
                }
                Triple(startKey, endKey, labels)
            }
            StatsPeriod.YEAR -> {
                val startKey = PeriodKey.monthly(today.withDayOfYear(1))
                val endKey = PeriodKey.monthly(today.withDayOfYear(1).plusMonths(11))
                val labels = (1..12).map { month ->
                    YearMonth.of(today.year, month).month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
                }
                Triple(startKey, endKey, labels)
            }
        }
    }

    private fun formatDayLabel(date: LocalDate): String {
        return date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()) + " " + date.dayOfMonth
    }

    private fun formatDateLabel(dateStr: String): String {
        return try {
            val date = LocalDate.parse(dateStr)
            formatDayLabel(date)
        } catch (_: Exception) {
            dateStr
        }
    }

    // ── XP data points ──

    private fun buildXpDataPoints(
        xpEvents: List<com.questline.app.data.remote.dto.XpEventDto>,
        today: LocalDate,
        period: StatsPeriod,
    ): List<XpDataPoint> {
        return when (period) {
            StatsPeriod.DAY -> {
                // Single day: group by hour or just total
                val total = xpEvents.sumOf { it.amount }
                listOf(XpDataPoint(today.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()), total))
            }
            StatsPeriod.WEEK -> {
                val monday = today.with(DayOfWeek.MONDAY)
                (0..6).map { offset ->
                    val day = monday.plusDays(offset.toLong())
                    val dayXp = xpEvents.filter { event ->
                        try {
                            LocalDate.parse(event.createdAt.take(10)) == day
                        } catch (_: Exception) {
                            false
                        }
                    }.sumOf { it.amount }
                    XpDataPoint(day.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()), dayXp)
                }
            }
            StatsPeriod.MONTH -> {
                (1..today.lengthOfMonth()).map { day ->
                    val dayDate = today.withDayOfMonth(day)
                    val dayXp = xpEvents.filter { event ->
                        try {
                            LocalDate.parse(event.createdAt.take(10)) == dayDate
                        } catch (_: Exception) {
                            false
                        }
                    }.sumOf { it.amount }
                    XpDataPoint(day.toString(), dayXp)
                }
            }
            StatsPeriod.YEAR -> {
                (1..12).map { month ->
                    val monthName = YearMonth.of(today.year, month).month
                        .getDisplayName(TextStyle.SHORT, Locale.getDefault())
                    val monthXp = xpEvents.filter { event ->
                        try {
                            event.createdAt.take(7) == String.format("%04d-%02d", today.year, month)
                        } catch (_: Exception) {
                            false
                        }
                    }.sumOf { it.amount }
                    XpDataPoint(monthName, monthXp)
                }
            }
        }
    }

    // ── Streak display ──

    private fun buildHabitStreaks(
        streaks: List<com.questline.app.data.remote.dto.StreakDto>,
        quests: List<com.questline.app.data.remote.dto.QuestDto>,
        habits: List<com.questline.app.data.remote.dto.HabitDto>,
        selectedHabitId: String?,
    ): List<HabitStreakDisplay> {
        val habitMap = habits.associateBy { it.id }
        val questMap = quests.associateBy { it.id }

        // Build per-habit longest streak
        val habitLongest = mutableMapOf<String, Int>()
        for (s in streaks) {
            val quest = questMap[s.questId] ?: continue
            val habitId = quest.habitId ?: continue
            val current = habitLongest.getOrDefault(habitId, 0)
            if (s.longest > current) {
                habitLongest[habitId] = s.longest
            }
        }

        // Build display list — one per streak for non-filtered, or filtered by habit
        val result = mutableListOf<HabitStreakDisplay>()
        for (s in streaks) {
            val quest = questMap[s.questId] ?: continue
            val habitId = quest.habitId ?: continue
            if (selectedHabitId != null && habitId != selectedHabitId) continue
            val habit = habitMap[habitId] ?: continue

            result.add(
                HabitStreakDisplay(
                    habitName = habit.name,
                    colorArgb = try {
                        android.graphics.Color.parseColor(habit.color)
                    } catch (_: Exception) {
                        android.graphics.Color.GRAY
                    },
                    currentStreak = s.current,
                    longestStreak = s.longest,
                    questName = quest.title,
                )
            )
        }
        return result
    }

    // ── Status grid ──

    private fun buildStatusGrid(
        filteredQuests: List<com.questline.app.data.remote.dto.QuestDto>,
        instances: List<com.questline.app.data.remote.dto.QuestInstanceDto>,
        habits: List<com.questline.app.data.remote.dto.HabitDto>,
        today: LocalDate,
        period: StatsPeriod,
        dayLabels: List<String>,
    ): List<StatusGridRow> {
        val habitMap = habits.associateBy { it.id }
        val instancesByQuest = instances.groupBy { it.questId }

        val result = mutableListOf<StatusGridRow>()

        // Group quests by habit
        val questsByHabit = filteredQuests.groupBy { it.habitId }

        for ((habitId, habitQuests) in questsByHabit) {
            val habit = habitId?.let { habitMap[it] } ?: continue

            // For each period in the range, check if any of this habit's quests are completed
            val periodStatuses = when (period) {
                StatsPeriod.DAY -> {
                    dayLabels.mapIndexed { _, label ->
                        val key = PeriodKey.daily(today)
                        val habitInstances = habitQuests.flatMap { q ->
                            instancesByQuest[q.id]?.filter { it.periodKey == key } ?: emptyList()
                        }
                        val anyCompleted = habitInstances.any { it.completed }
                        val anyPartial = habitInstances.any { it.progress > 0 && !it.completed }
                        PeriodCompletion(label, anyCompleted, anyPartial)
                    }
                }
                StatsPeriod.WEEK -> {
                    val monday = today.with(DayOfWeek.MONDAY)
                    dayLabels.mapIndexed { index, label ->
                        val day = monday.plusDays(index.toLong())
                        val key = PeriodKey.daily(day)
                        val habitInstances = habitQuests.flatMap { q ->
                            instancesByQuest[q.id]?.filter { it.periodKey == key } ?: emptyList()
                        }
                        val anyCompleted = habitInstances.any { it.completed }
                        val anyPartial = habitInstances.any { it.progress > 0 && !it.completed }
                        PeriodCompletion(label, anyCompleted, anyPartial)
                    }
                }
                StatsPeriod.MONTH -> {
                    (1..today.lengthOfMonth()).map { day ->
                        val dayDate = today.withDayOfMonth(day)
                        val key = PeriodKey.daily(dayDate)
                        val habitInstances = habitQuests.flatMap { q ->
                            instancesByQuest[q.id]?.filter { it.periodKey == key } ?: emptyList()
                        }
                        val anyCompleted = habitInstances.any { it.completed }
                        val anyPartial = habitInstances.any { it.progress > 0 && !it.completed }
                        PeriodCompletion(day.toString(), anyCompleted, anyPartial)
                    }
                }
                StatsPeriod.YEAR -> {
                    (1..12).map { month ->
                        val monthKey = String.format("%04d-%02d", today.year, month)
                        val habitInstances = habitQuests.flatMap { q ->
                            instancesByQuest[q.id]?.filter { it.periodKey == monthKey } ?: emptyList()
                        }
                        val anyCompleted = habitInstances.any { it.completed }
                        val anyPartial = habitInstances.any { it.progress > 0 && !it.completed }
                        val label = YearMonth.of(today.year, month).month
                            .getDisplayName(TextStyle.SHORT, Locale.getDefault())
                        PeriodCompletion(label, anyCompleted, anyPartial)
                    }
                }
            }

            result.add(
                StatusGridRow(
                    habitName = habit.name,
                    colorArgb = try {
                        android.graphics.Color.parseColor(habit.color)
                    } catch (_: Exception) {
                        android.graphics.Color.GRAY
                    },
                    periods = periodStatuses,
                )
            )
        }

        return result
    }
}

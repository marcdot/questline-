package com.questline.app.ui.screens.add

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.questline.app.data.remote.SupabaseRemoteSource
import com.questline.app.data.remote.dto.HabitDto
import com.questline.app.data.repo.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * UI state for the Quick-add bottom sheet.
 *
 * Three independent form sections: New Habit, New Quest, Log Sleep.
 */
data class AddSheetUiState(
    // ── Sheet state ──
    val activeTab: AddTab = AddTab.NEW_HABIT,

    // ── Habit form ──
    val habitName: String = "",
    val habitColor: String = "#E8743B", // default HabitEmber
    val isCreatingHabit: Boolean = false,
    val habitCreated: HabitDto? = null,
    val habitError: String? = null,

    // ── Quest form ──
    val availableHabits: List<HabitDto> = emptyList(),
    val selectedHabitId: String? = null,
    val questTitle: String = "",
    val questCadence: String = "daily",
    val questWeekdays: Set<String> = emptySet(), // "mon","tue",…
    val questCalendarSync: Boolean = false,
    val questTargetCount: Int = 1,
    val questUnit: String = "",
    val isCreatingQuest: Boolean = false,
    val questCreated: Boolean = false,
    val questError: String? = null,

    // ── Sleep form ──
    val sleepNightOf: String = LocalDate.now().toString(),
    val sleepHours: Double = 7.0,
    val isLoggingSleep: Boolean = false,
    val sleepLogged: Boolean = false,
    val sleepError: String? = null,
)

enum class AddTab {
    NEW_HABIT,
    NEW_QUEST,
    LOG_SLEEP,
}

@HiltViewModel
class AddViewModel @Inject constructor(
    private val remoteSource: SupabaseRemoteSource,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddSheetUiState())
    val uiState: StateFlow<AddSheetUiState> = _uiState.asStateFlow()

    // ── Sheet visibility ──

    fun setActiveTab(tab: AddTab) {
        _uiState.update { it.copy(activeTab = tab) }
    }

    /** Reset forms and load habits. Call when sheet opens. */
    fun loadHabits() {
        viewModelScope.launch {
            val userId = authRepository.cachedUserId ?: return@launch
            try {
                val habits = remoteSource.getHabits(userId)
                _uiState.update {
                    it.copy(
                        availableHabits = habits,
                        selectedHabitId = habits.firstOrNull()?.id,
                    )
                }
            } catch (_: Exception) {
                // silently fail — user can still select later
            }
        }
    }

    // ── Habit form ──

    fun onHabitNameChange(name: String) {
        _uiState.update { it.copy(habitName = name, habitError = null) }
    }

    fun onHabitColorChange(color: String) {
        _uiState.update { it.copy(habitColor = color) }
    }

    fun createHabit() {
        val name = _uiState.value.habitName.trim()
        if (name.isBlank()) {
            _uiState.update { it.copy(habitError = "Name is required") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isCreatingHabit = true, habitError = null) }
            try {
                val created = remoteSource.insertHabit(
                    name = name,
                    color = _uiState.value.habitColor,
                )
                if (created != null) {
                    _uiState.update {
                        it.copy(
                            isCreatingHabit = false,
                            habitCreated = created,
                            habitName = "",
                            // Pre-select this habit for the quest tab
                            selectedHabitId = created.id,
                        )
                    }
                } else {
                    _uiState.update { it.copy(isCreatingHabit = false, habitError = "Failed to create habit") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isCreatingHabit = false, habitError = e.message ?: "Failed to create habit") }
            }
        }
    }

    fun clearHabitCreated() {
        _uiState.update { it.copy(habitCreated = null) }
    }

    // ── Quest form ──

    fun onSelectedHabitChange(habitId: String) {
        _uiState.update { it.copy(selectedHabitId = habitId, questError = null) }
    }

    fun onQuestTitleChange(title: String) {
        _uiState.update { it.copy(questTitle = title, questError = null) }
    }

    fun onQuestCadenceChange(cadence: String) {
        _uiState.update {
            it.copy(
                questCadence = cadence,
                // Clear weekdays if switching to daily
                questWeekdays = if (cadence == "daily") emptySet() else it.questWeekdays,
            )
        }
    }

    fun onQuestWeekdayToggle(weekday: String) {
        _uiState.update {
            val current = it.questWeekdays.toMutableSet()
            if (current.contains(weekday)) current.remove(weekday) else current.add(weekday)
            // Keep sorted mon→sun per docs/02 contract
            val sorted = current.toList().sortedBy { WeekdayOrder.indexOf(it) }.toSet()
            it.copy(questWeekdays = sorted)
        }
    }

    fun onQuestCalendarSyncChange(enabled: Boolean) {
        _uiState.update { it.copy(questCalendarSync = enabled) }
    }

    fun onQuestTargetCountChange(count: Int) {
        _uiState.update { it.copy(questTargetCount = maxOf(1, count)) }
    }

    fun onQuestUnitChange(unit: String) {
        _uiState.update { it.copy(questUnit = unit) }
    }

    fun createQuest() {
        val title = _uiState.value.questTitle.trim()
        if (title.isBlank()) {
            _uiState.update { it.copy(questError = "Title is required") }
            return
        }
        val habitId = _uiState.value.selectedHabitId
        if (habitId == null) {
            _uiState.update { it.copy(questError = "Select a habit") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isCreatingQuest = true, questError = null) }
            try {
                val cadence = _uiState.value.questCadence
                val weekdays = _uiState.value.questWeekdays.toList()
                val targetCount = _uiState.value.questTargetCount
                val unit = _uiState.value.questUnit.trim().ifBlank { null }
                val calendarSync = _uiState.value.questCalendarSync

                val created = remoteSource.insertQuest(
                    habitId = habitId,
                    title = title,
                    cadence = cadence,
                    targetCount = targetCount,
                    unit = unit,
                    weekdays = weekdays,
                    calendarSync = calendarSync,
                )
                if (created != null) {
                    // If weekly+ with weekdays, call generate_child_quests
                    if (cadence != "daily" && weekdays.isNotEmpty()) {
                        try {
                            remoteSource.generateChildQuests(created.id)
                        } catch (e: Exception) {
                            // Surface the error — ensure_instances does NOT create child quests
                            // (docs/05 §3 only materialises instances for EXISTING quests).
                            // If generate_child_quests fails, weekly+ weekdays quests never
                            // produce daily children. Log and set questError so the user
                            // can retry.
                            _uiState.update {
                                it.copy(
                                    isCreatingQuest = false,
                                    questError = "Child quest generation failed: ${e.message}. Please try again.",
                                )
                            }
                            return@launch
                        }
                    }

                    // P4 follow-up: ensure instances exist for today so the new quest
                    // appears immediately on Home (not only on next app open).
                    try {
                        remoteSource.ensureInstances(java.time.LocalDate.now().toString())
                    } catch (_: Exception) {
                        // Non-fatal: instances will be created on next app launch
                    }

                    // If calendar sync was requested, create the Google Calendar event
                    if (calendarSync) {
                        try {
                            remoteSource.syncQuestToCalendar(created.id, "create")
                        } catch (_: Exception) {
                            // Non-fatal: sync can be retried later from the quest edit screen
                        }
                    }

                    _uiState.update {
                        it.copy(
                            isCreatingQuest = false,
                            questCreated = true,
                            questTitle = "",
                            questWeekdays = emptySet(),
                            questTargetCount = 1,
                            questUnit = "",
                            questCalendarSync = false,
                        )
                    }
                } else {
                    _uiState.update { it.copy(isCreatingQuest = false, questError = "Failed to create quest") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isCreatingQuest = false, questError = e.message ?: "Failed to create quest") }
            }
        }
    }

    fun clearQuestCreated() {
        _uiState.update { it.copy(questCreated = false) }
    }

    // ── Sleep form ──

    fun onSleepNightOfChange(date: String) {
        _uiState.update { it.copy(sleepNightOf = date, sleepError = null) }
    }

    fun onSleepHoursChange(hours: Double) {
        _uiState.update { it.copy(sleepHours = hours.coerceIn(0.0, 24.0)) }
    }

    fun logSleep() {
        val nightOf = _uiState.value.sleepNightOf
        val hours = _uiState.value.sleepHours

        viewModelScope.launch {
            _uiState.update { it.copy(isLoggingSleep = true, sleepError = null) }
            try {
                val result = remoteSource.logSleep(nightOf, hours)
                _uiState.update {
                    it.copy(
                        isLoggingSleep = false,
                        sleepLogged = result != null,
                        sleepError = if (result == null) "Failed to log sleep" else null,
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoggingSleep = false, sleepError = e.message ?: "Failed to log sleep") }
            }
        }
    }

    fun clearSleepLogged() {
        _uiState.update { it.copy(sleepLogged = false) }
    }

    // ── Reset ──

    private fun resetForms() {
        _uiState.update {
            AddSheetUiState(
                availableHabits = it.availableHabits,
                selectedHabitId = it.availableHabits.firstOrNull()?.id,
            )
        }
    }

    companion object {
        private val WeekdayOrder = listOf("mon", "tue", "wed", "thu", "fri", "sat", "sun")
    }
}

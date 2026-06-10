package com.questline.app.ui.screens.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.questline.app.data.repo.AuthRepository
import com.questline.app.data.remote.SupabaseRemoteSource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Represents a habit colour palette option.
 * Matches docs/03 §2 habit colour palette.
 */
data class HabitColorOption(
    val name: String,
    val hex: String,
)

/** The 8 habit colours from the design system. */
val HABIT_COLORS = listOf(
    HabitColorOption("Ember", "#E8743B"),
    HabitColorOption("Gold", "#E0B040"),
    HabitColorOption("Fern", "#5AA469"),
    HabitColorOption("Teal", "#3E9CA8"),
    HabitColorOption("Sky", "#4F86C6"),
    HabitColorOption("Iris", "#7A6CD8"),
    HabitColorOption("Rose", "#C85A8E"),
    HabitColorOption("Slate", "#8A8F98"),
)

data class OnboardingUiState(
    val isLoading: Boolean = false,
    val isComplete: Boolean = false,
    val errorMessage: String? = null,
    val habitName: String = "",
    val selectedColor: String = HABIT_COLORS[0].hex,
    val questTitle: String = "",
    val selectedCadence: String = "daily",
)

/**
 * ViewModel for the onboarding flow.
 * Creates the user's first habit (name + colour) and first quest.
 */
@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val remoteSource: SupabaseRemoteSource,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    fun onHabitNameChanged(name: String) {
        _uiState.value = _uiState.value.copy(habitName = name)
    }

    fun onColorSelected(color: String) {
        _uiState.value = _uiState.value.copy(selectedColor = color)
    }

    fun onQuestTitleChanged(title: String) {
        _uiState.value = _uiState.value.copy(questTitle = title)
    }

    fun onCadenceSelected(cadence: String) {
        _uiState.value = _uiState.value.copy(selectedCadence = cadence)
    }

    /** Validate and submit onboarding — create habit + quest. */
    fun completeOnboarding() {
        val state = _uiState.value
        if (state.habitName.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please give your habit a name")
            return
        }
        if (state.questTitle.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please give your quest a title")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                // 1. Create the habit
                val habit = remoteSource.insertHabit(
                    name = state.habitName,
                    color = state.selectedColor,
                )
                if (habit == null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Failed to create habit. Please try again."
                    )
                    return@launch
                }

                // 2. Create the first quest linked to the habit
                val quest = remoteSource.insertQuest(
                    habitId = habit.id,
                    title = state.questTitle,
                    cadence = state.selectedCadence,
                )
                if (quest == null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Failed to create quest. Please try again."
                    )
                    return@launch
                }

                // 3. Done!
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isComplete = true,
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "Something went wrong"
                )
            }
        }
    }
}

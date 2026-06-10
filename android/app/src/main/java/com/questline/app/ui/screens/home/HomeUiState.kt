package com.questline.app.ui.screens.home

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb

/**
 * UI state for the home screen — today's quests, stats, and sleep data.
 */
data class HomeUiState(
    val isLoading: Boolean = true,
    val questCards: List<QuestCardUiModel> = emptyList(),
    val todayCompleted: Int = 0,
    val todayTotal: Int = 0,
    val currentStreak: Int = 0,
    val xpBalance: Int = 0,
    val xpToday: Int = 0,
    val sleepData: List<SleepDataPoint> = emptyList(),
    val errorMessage: String? = null,
)

/**
 * Display model for a single quest card on the home screen.
 */
data class QuestCardUiModel(
    val instanceId: String,
    val questId: String,
    val habitId: String,
    val title: String,
    val habitColorArgb: Int,
    val progress: Int,
    val targetCount: Int,
    val completed: Boolean,
    val cadence: String,
    val habitName: String,
) {
    val habitColor: Color get() = Color(habitColorArgb)

    /** Ratio of progress to target, clamped 0..1 */
    val fillRatio: Float
        get() = if (targetCount > 0) (progress.toFloat() / targetCount).coerceIn(0f, 1f) else 0f
}

/**
 * A single data point for the sleep chart.
 */
data class SleepDataPoint(
    val nightOf: String,
    val hours: Double,
)

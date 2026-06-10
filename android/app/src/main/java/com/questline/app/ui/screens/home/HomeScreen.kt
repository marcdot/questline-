package com.questline.app.ui.screens.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.questline.app.R
import com.questline.app.ui.components.DashboardStat
import com.questline.app.ui.components.QuestCard
import com.questline.app.ui.components.SleepChart

/**
 * Home screen — the core of the app.
 *
 * DESIGN-SYSTEM.md §6:
 * - DashboardStat: today ratio, current streak, XP — compact pills
 * - QuestCard: leading habit-colour bar, title, progress/target, tap=+1, hold=complete
 * - SleepChart: line/area of hours per night across the month
 *
 * P3 gate: FEEL per DESIGN.md §3 (Ember Fill timings, motion spec §5).
 */
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    when {
        uiState.isLoading && uiState.questCards.isEmpty() -> {
            // Initial loading state
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = stringResource(R.string.home_loading),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        uiState.errorMessage != null && uiState.questCards.isEmpty() -> {
            // Error state with retry
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp),
                ) {
                    Text(
                        text = stringResource(R.string.home_error),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.error,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = uiState.errorMessage ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(16.dp))
                    androidx.compose.material3.TextButton(
                        onClick = viewModel::refresh,
                    ) {
                        Text(stringResource(R.string.home_retry))
                    }
                }
            }
        }

        else -> {
            // Main dashboard content
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = 12.dp,
                    end = 12.dp,
                    top = 8.dp,
                    bottom = 88.dp, // room for bottom nav + FAB
                ),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // ── Mini dashboard ──
                item(key = "dashboard") {
                    DashboardStat(
                        todayCompleted = uiState.todayCompleted,
                        todayTotal = uiState.todayTotal,
                        currentStreak = uiState.currentStreak,
                        xpBalance = uiState.xpBalance,
                        xpToday = uiState.xpToday,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 4.dp),
                    )
                }

                // ── Section title ──
                item(key = "section_title") {
                    if (uiState.questCards.isNotEmpty()) {
                        Text(
                            text = stringResource(R.string.home_quests_title),
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.padding(horizontal = 4.dp),
                        )
                    }
                }

                // ── Quest cards ──
                if (uiState.questCards.isEmpty()) {
                    item(key = "empty") {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 48.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = stringResource(R.string.home_empty),
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                } else {
                    items(
                        items = uiState.questCards,
                        key = { it.instanceId },
                    ) { card ->
                        QuestCard(
                            habitColor = card.habitColor,
                            title = card.title,
                            progress = card.progress,
                            targetCount = card.targetCount,
                            completed = card.completed,
                            onTap = { viewModel.onTapQuest(card.instanceId) },
                            onHoldComplete = { viewModel.onCompleteQuest(card.instanceId) },
                        )
                    }
                }

                // ── Sleep chart ──
                item(key = "sleep") {
                    Spacer(Modifier.height(8.dp))
                    SleepChart(
                        hours = uiState.sleepData.map { it.hours.toFloat() },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

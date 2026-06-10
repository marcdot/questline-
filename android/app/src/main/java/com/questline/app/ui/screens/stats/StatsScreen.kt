package com.questline.app.ui.screens.stats

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * Stats screen — P5 gate: period/habit filters, XP graph, streaks,
 * status grid, sleep heatmap.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun StatsScreen(
    viewModel: StatsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    when {
        uiState.isLoading && uiState.habits.isEmpty() -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        }

        uiState.errorMessage != null && uiState.habits.isEmpty() -> {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = uiState.errorMessage ?: "Error loading stats",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(16.dp))
                    TextButton(onClick = viewModel::loadStats) {
                        Text("Retry")
                    }
                }
            }
        }

        else -> {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // ── Period filter ──
                item(key = "period_filter") {
                    PeriodFilter(
                        selected = uiState.selectedPeriod,
                        onPeriodChange = viewModel::onPeriodChange,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }

                // ── Habit filter ──
                item(key = "habit_filter") {
                    HabitFilter(
                        habits = uiState.habits,
                        selectedHabitId = uiState.selectedHabitId,
                        onHabitChange = viewModel::onHabitFilterChange,
                    )
                }

                if (uiState.errorMessage != null) {
                    item(key = "error") {
                        Text(
                            text = uiState.errorMessage ?: "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(horizontal = 4.dp),
                        )
                    }
                }

                // ── XP graph ──
                item(key = "xp_graph") {
                    SectionCard(title = "XP Over Time") {
                        XpBarChart(
                            dataPoints = uiState.xpDataPoints,
                            totalXp = uiState.xpTotalForPeriod,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(180.dp),
                        )
                    }
                }

                // ── Streaks ──
                item(key = "streaks") {
                    SectionCard(title = "Streaks") {
                        if (uiState.habitStreaks.isEmpty()) {
                            Text(
                                text = "No streak data yet.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp),
                            )
                        } else {
                            uiState.habitStreaks.forEach { streak ->
                                StreakRow(streak = streak)
                                if (streak != uiState.habitStreaks.last()) {
                                    HorizontalDivider(
                                        modifier = Modifier.padding(vertical = 4.dp),
                                        color = MaterialTheme.colorScheme.outlineVariant,
                                    )
                                }
                            }
                        }
                    }
                }

                // ── Status grid ──
                item(key = "status_grid") {
                    SectionCard(title = "Completion Status") {
                        if (uiState.statusGrid.isEmpty()) {
                            Text(
                                text = "No data for this period.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp),
                            )
                        } else {
                            // Column headers
                            val periods = uiState.statusGrid.firstOrNull()?.periods ?: emptyList()
                            StatusGridHeader(periods = periods)
                            Spacer(Modifier.height(8.dp))
                            uiState.statusGrid.forEach { row ->
                                StatusGridRowView(row = row)
                                Spacer(Modifier.height(6.dp))
                            }
                        }
                    }
                }

                // ── Sleep heatmap ──
                item(key = "sleep") {
                    SectionCard(title = "Sleep (this month)") {
                        if (uiState.sleepData.isEmpty()) {
                            Text(
                                text = "No sleep data logged yet.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp),
                            )
                        } else {
                            SleepHeatmap(
                                data = uiState.sleepData,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(120.dp),
                            )
                        }
                    }
                }

                // Bottom spacer for nav bar
                item(key = "spacer") {
                    Spacer(Modifier.height(88.dp))
                }
            }
        }
    }
}

// ── Period Filter ──

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PeriodFilter(
    selected: StatsPeriod,
    onPeriodChange: (StatsPeriod) -> Unit,
    modifier: Modifier = Modifier,
) {
    SingleChoiceSegmentedButtonRow(
        modifier = modifier.fillMaxWidth(),
    ) {
        StatsPeriod.entries.forEachIndexed { index, period ->
            SegmentedButton(
                selected = selected == period,
                onClick = { onPeriodChange(period) },
                shape = SegmentedButtonDefaults.itemShape(
                    index = index,
                    count = StatsPeriod.entries.size,
                ),
            ) {
                Text(
                    text = period.label,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}

// ── Habit Filter ──

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HabitFilter(
    habits: List<HabitStatItem>,
    selectedHabitId: String?,
    onHabitChange: (String?) -> Unit,
) {
    if (habits.isEmpty()) return

    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        // "All" chip
        FilterChip(
            selected = selectedHabitId == null,
            onClick = { onHabitChange(null) },
            label = { Text("All", style = MaterialTheme.typography.labelMedium) },
        )

        habits.forEach { habit ->
            val hexColor = Color(habit.colorArgb)
            FilterChip(
                selected = selectedHabitId == habit.id,
                onClick = {
                    if (selectedHabitId == habit.id) {
                        onHabitChange(null)
                    } else {
                        onHabitChange(habit.id)
                    }
                },
                label = { Text(habit.name, style = MaterialTheme.typography.labelMedium) },
                leadingIcon = {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(hexColor, CircleShape),
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = hexColor.copy(alpha = 0.12f),
                ),
            )
        }
    }
}

// ── Section Card ──

@Composable
private fun SectionCard(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            content()
        }
    }
}

// ── XP Bar Chart (Canvas) ──

@Composable
private fun XpBarChart(
    dataPoints: List<XpDataPoint>,
    totalXp: Int,
    modifier: Modifier = Modifier,
) {
    if (dataPoints.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Text(
                text = "No XP data for this period.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }

    val barColor = MaterialTheme.colorScheme.primary
    val gridColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val xpColor = Color(0xFFB8902E) // Xp gold

    Canvas(modifier = modifier) {
        val maxXp = dataPoints.maxOfOrNull { it.xp }?.coerceAtLeast(1) ?: 1
        val barWidth = size.width / dataPoints.size * 0.6f
        val gap = size.width / dataPoints.size * 0.4f
        val chartHeight = size.height - 40f // leave room for labels

        // Draw grid lines
        for (i in 0..4) {
            val y = chartHeight * (1f - i / 4f)
            drawLine(gridColor, Offset(0f, y), Offset(size.width, y), strokeWidth = 0.5f)
        }

        // Draw bars
        dataPoints.forEachIndexed { index, point ->
            val barHeight = if (maxXp > 0) (point.xp.toFloat() / maxXp) * chartHeight else 0f
            val x = index * (barWidth + gap) + gap / 2

            // Bar
            drawRoundRect(
                color = barColor,
                topLeft = Offset(x, chartHeight - barHeight),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(3f, 3f),
            )

            // Label below
            drawContext.canvas.nativeCanvas.drawText(
                point.label,
                x + barWidth / 2,
                size.height - 4f,
                android.graphics.Paint().apply {
                    color = labelColor.hashCode()
                    textSize = 24f
                    textAlign = android.graphics.Paint.Align.CENTER
                },
            )
        }

        // Total XP label
        drawContext.canvas.nativeCanvas.drawText(
            "Total: $totalXp XP",
            8f,
            28f,
            android.graphics.Paint().apply {
                color = xpColor.hashCode()
                textSize = 30f
                isFakeBoldText = true
            },
        )
    }
}

// ── Streak Row ──

@Composable
private fun StreakRow(streak: HabitStreakDisplay) {
    val color = Color(streak.colorArgb)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f),
        ) {
            // Colour dot
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(color, CircleShape),
            )
            Spacer(Modifier.width(8.dp))
            Column {
                Text(
                    text = streak.habitName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = streak.questName,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "${streak.currentStreak}🔥",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "Longest: ${streak.longestStreak}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// ── Status Grid ──

@Composable
private fun StatusGridHeader(periods: List<PeriodCompletion>) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Habit name header
        Box(modifier = Modifier.width(80.dp)) {
            Text(
                text = "Habit",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        // Period dots
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            periods.forEach { period ->
                Box(
                    modifier = Modifier.size(20.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = period.label.take(2),
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 8.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusGridRowView(row: StatusGridRow) {
    val color = Color(row.colorArgb)

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Habit name
        Row(
            modifier = Modifier.width(80.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(color, CircleShape),
            )
            Spacer(Modifier.width(4.dp))
            Text(
                text = row.habitName,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // Status dots
        Row(
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            row.periods.forEach { period ->
                val dotColor = when {
                    period.completed -> color
                    period.partial -> color.copy(alpha = 0.4f)
                    else -> MaterialTheme.colorScheme.surfaceVariant
                }
                Box(
                    modifier = Modifier
                        .size(18.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(dotColor, RoundedCornerShape(4.dp)),
                )
            }
        }
    }
}

// ── Sleep Heatmap (Canvas) ──

@Composable
private fun SleepHeatmap(
    data: List<SleepDay>,
    modifier: Modifier = Modifier,
) {
    if (data.isEmpty()) return

    Canvas(modifier = modifier) {
        val cellW = size.width / data.size
        val cellH = size.height

        data.forEachIndexed { index, day ->
            val intensity = (day.hours / 8f).coerceIn(0f, 1f) // 8h = full
            val x = index * cellW

            // Color: deeper blue for more sleep
            val alpha = intensity.coerceIn(0.15f, 0.85f)
            val cellColor = Color(0xFF4F86C6).copy(alpha = alpha)

            drawRoundRect(
                color = cellColor,
                topLeft = Offset(x + 1f, 0f),
                size = Size(cellW - 2f, cellH),
                cornerRadius = CornerRadius(3f, 3f),
            )

            // Hour label
            drawContext.canvas.nativeCanvas.drawText(
                "${day.hours.toInt()}h",
                x + cellW / 2,
                cellH / 2 + 6f,
                android.graphics.Paint().apply {
                    color = android.graphics.Color.WHITE
                    textSize = 22f
                    textAlign = android.graphics.Paint.Align.CENTER
                    isFakeBoldText = true
                },
            )
        }
    }
}

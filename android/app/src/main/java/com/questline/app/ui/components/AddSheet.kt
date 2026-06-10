package com.questline.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.questline.app.ui.screens.add.AddSheetUiState
import com.questline.app.ui.screens.add.AddTab
import com.questline.app.ui.screens.add.AddViewModel
import com.questline.app.ui.theme.HabitAmber
import com.questline.app.ui.theme.HabitEmber
import com.questline.app.ui.theme.HabitFern
import com.questline.app.ui.theme.HabitIris
import com.questline.app.ui.theme.HabitRose
import com.questline.app.ui.theme.HabitSky
import com.questline.app.ui.theme.HabitSlate
import com.questline.app.ui.theme.HabitTeal

/**
 * Quick-add bottom sheet — New Habit, New Quest, Log Sleep.
 *
 * DESIGN-SYSTEM.md §xl: bottom sheet with segmented tab header.
 * BUILD.md §P4: cadence + weekdays + calendar toggle.
 * Weekly+weekdays → calls generate_child_quests RPC.
 * Sleep upsert via log_sleep RPC.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AddSheet(
    onDismiss: () -> Unit,
    viewModel: AddViewModel = hiltViewModel(),
) {
    val state = viewModel.uiState.value

    // Call open() when sheet appears (sets up forms, loads habits)
    LaunchedEffect(Unit) {
        viewModel.loadHabits()
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            // ── Header with tabs ──
            AddSheetTabs(
                activeTab = state.activeTab,
                onTabChange = viewModel::setActiveTab,
            )

            Spacer(Modifier.height(20.dp))

            // ── Tab content ──
            when (state.activeTab) {
                AddTab.NEW_HABIT -> HabitForm(
                    state = state,
                    onNameChange = viewModel::onHabitNameChange,
                    onColorChange = viewModel::onHabitColorChange,
                    onSave = viewModel::createHabit,
                    onSwitchToQuest = { viewModel.setActiveTab(AddTab.NEW_QUEST) },
                    onDone = onDismiss,
                )
                AddTab.NEW_QUEST -> QuestForm(
                    state = state,
                    onHabitChange = viewModel::onSelectedHabitChange,
                    onTitleChange = viewModel::onQuestTitleChange,
                    onCadenceChange = viewModel::onQuestCadenceChange,
                    onWeekdayToggle = viewModel::onQuestWeekdayToggle,
                    onCalendarSyncChange = viewModel::onQuestCalendarSyncChange,
                    onTargetCountChange = viewModel::onQuestTargetCountChange,
                    onUnitChange = viewModel::onQuestUnitChange,
                    onSave = viewModel::createQuest,
                    onDone = onDismiss,
                )
                AddTab.LOG_SLEEP -> SleepForm(
                    state = state,
                    onNightOfChange = viewModel::onSleepNightOfChange,
                    onHoursChange = viewModel::onSleepHoursChange,
                    onSave = viewModel::logSleep,
                    onDone = onDismiss,
                )
            }
        }
    }
}

// ── Tab Header ──

private val tabLabels = mapOf(
    AddTab.NEW_HABIT to "Habit",
    AddTab.NEW_QUEST to "Quest",
    AddTab.LOG_SLEEP to "Sleep",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddSheetTabs(
    activeTab: AddTab,
    onTabChange: (AddTab) -> Unit,
) {
    var selectedIndex by remember(activeTab) { mutableIntStateOf(activeTab.ordinal) }

    SingleChoiceSegmentedButtonRow(
        modifier = Modifier.fillMaxWidth(),
    ) {
        AddTab.entries.forEachIndexed { index, tab ->
            SegmentedButton(
                selected = selectedIndex == index,
                onClick = {
                    selectedIndex = index
                    onTabChange(tab)
                },
                shape = SegmentedButtonDefaults.itemShape(
                    index = index,
                    count = AddTab.entries.size,
                ),
            ) {
                Text(
                    text = tabLabels[tab] ?: tab.name,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}

// ── Habit Form ──

@Composable
private fun HabitForm(
    state: AddSheetUiState,
    onNameChange: (String) -> Unit,
    onColorChange: (String) -> Unit,
    onSave: () -> Unit,
    onSwitchToQuest: () -> Unit,
    onDone: () -> Unit,
) {
    if (state.habitCreated != null) {
        // Success state
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Spacer(Modifier.height(16.dp))
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = "\"${state.habitCreated.name}\" created",
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Switch to Quest tab to add a quest for it.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            Button(onClick = onSwitchToQuest) {
                Text("Add Quest")
            }
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onDone) {
                Text("Done")
            }
        }
        return
    }

    Column {
        Text(
            text = "New Habit",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = state.habitName,
            onValueChange = onNameChange,
            label = { Text("Habit name") },
            placeholder = { Text("e.g. Read daily, Exercise") },
            singleLine = true,
            isError = state.habitError != null,
            supportingText = state.habitError?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(20.dp))

        Text(
            text = "Colour",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(bottom = 8.dp),
        )

        val habitColors = listOf(
            "#E8743B" to HabitEmber,
            "#E0B040" to HabitAmber,
            "#5AA469" to HabitFern,
            "#3E9CA8" to HabitTeal,
            "#4F86C6" to HabitSky,
            "#7A6CD8" to HabitIris,
            "#C85A8E" to HabitRose,
            "#8A8F98" to HabitSlate,
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            habitColors.forEach { (hex, color) ->
                val isSelected = state.habitColor == hex
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(color, CircleShape)
                        .then(
                            if (isSelected)
                                Modifier.border(3.dp, MaterialTheme.colorScheme.onSurface, CircleShape)
                            else
                                Modifier.border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape)
                        )
                        .clickable { onColorChange(hex) },
                    contentAlignment = Alignment.Center,
                ) {
                    if (isSelected) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Selected",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = onSave,
            enabled = state.habitName.isNotBlank() && !state.isCreatingHabit,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state.isCreatingHabit) Text("Creating…") else Text("Create Habit")
        }

        Spacer(Modifier.height(8.dp))

        OutlinedButton(onClick = onDone, modifier = Modifier.fillMaxWidth()) {
            Text("Cancel")
        }
    }
}

// ── Quest Form ──

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun QuestForm(
    state: AddSheetUiState,
    onHabitChange: (String) -> Unit,
    onTitleChange: (String) -> Unit,
    onCadenceChange: (String) -> Unit,
    onWeekdayToggle: (String) -> Unit,
    onCalendarSyncChange: (Boolean) -> Unit,
    onTargetCountChange: (Int) -> Unit,
    onUnitChange: (String) -> Unit,
    onSave: () -> Unit,
    onDone: () -> Unit,
) {
    if (state.questCreated) {
        // Success state
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Spacer(Modifier.height(16.dp))
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text(text = "Quest created!", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            Text(
                text = if (state.questCadence != "daily" && state.questWeekdays.isNotEmpty())
                    "Child quests will appear on selected days."
                else
                    "It will appear on your Home screen.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            Button(onClick = onDone) { Text("Done") }
        }
        return
    }

    Column {
        Text(
            text = "New Quest",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(16.dp))

        // Habit selector
        if (state.availableHabits.isNotEmpty()) {
            Text(
                text = "Habit",
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.padding(bottom = 4.dp),
            )
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                state.availableHabits.forEach { habit ->
                    val isSelected = state.selectedHabitId == habit.id
                    val hexColor = try {
                        Color(android.graphics.Color.parseColor(habit.color))
                    } catch (_: Exception) {
                        MaterialTheme.colorScheme.primary
                    }
                    FilterChip(
                        selected = isSelected,
                        onClick = { onHabitChange(habit.id) },
                        label = { Text(habit.name) },
                        leadingIcon = {
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(hexColor, CircleShape)
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = hexColor.copy(alpha = 0.12f),
                        ),
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
        }

        // Quest title
        OutlinedTextField(
            value = state.questTitle,
            onValueChange = onTitleChange,
            label = { Text("Quest title") },
            placeholder = { Text("e.g. Go for a run") },
            singleLine = true,
            isError = state.questError != null,
            supportingText = state.questError?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(16.dp))

        // Cadence picker
        Text(
            text = "Cadence",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(bottom = 4.dp),
        )

        val cadences = listOf(
            "daily" to "Daily",
            "weekly" to "Weekly",
            "monthly" to "Monthly",
            "yearly" to "Yearly",
        )
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            cadences.forEach { (value, label) ->
                val isSelected = state.questCadence == value
                FilterChip(
                    selected = isSelected,
                    onClick = { onCadenceChange(value) },
                    label = { Text(label) },
                )
            }
        }

        // Weekday selectors (only for weekly+)
        if (state.questCadence != "daily") {
            Spacer(Modifier.height(16.dp))
            Text(
                text = "Weekdays",
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.padding(bottom = 4.dp),
            )

            val weekdays = listOf(
                "mon" to "M", "tue" to "T", "wed" to "W",
                "thu" to "T", "fri" to "F", "sat" to "S", "sun" to "S",
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                weekdays.forEach { (key, label) ->
                    val isSelected = key in state.questWeekdays
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                else MaterialTheme.colorScheme.surfaceVariant,
                                RoundedCornerShape(8.dp),
                            )
                            .clickable { onWeekdayToggle(key) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // Target count + unit
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = state.questTargetCount.toString(),
                onValueChange = { v ->
                    val n = v.filter { it.isDigit() }.take(4).toIntOrNull() ?: 1
                    onTargetCountChange(n)
                },
                label = { Text("Target") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                modifier = Modifier.width(80.dp),
            )
            OutlinedTextField(
                value = state.questUnit,
                onValueChange = onUnitChange,
                label = { Text("Unit (optional)") },
                placeholder = { Text("km, pages…") },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
        }

        // Calendar sync toggle
        Spacer(Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    text = "Calendar sync",
                    style = MaterialTheme.typography.titleSmall,
                )
                Text(
                    text = "Sync quests to Google Calendar",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Switch(
                checked = state.questCalendarSync,
                onCheckedChange = onCalendarSyncChange,
            )
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = onSave,
            enabled = state.questTitle.isNotBlank()
                && state.selectedHabitId != null
                && !state.isCreatingQuest,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state.isCreatingQuest) Text("Creating…") else Text("Create Quest")
        }

        Spacer(Modifier.height(8.dp))

        OutlinedButton(onClick = onDone, modifier = Modifier.fillMaxWidth()) {
            Text("Cancel")
        }
    }
}

// ── Sleep Form ──

@Composable
private fun SleepForm(
    state: AddSheetUiState,
    onNightOfChange: (String) -> Unit,
    onHoursChange: (Double) -> Unit,
    onSave: () -> Unit,
    onDone: () -> Unit,
) {
    if (state.sleepLogged) {
        // Success state
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Spacer(Modifier.height(16.dp))
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text(text = "Sleep logged!", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(16.dp))
            Button(onClick = onDone) { Text("Done") }
        }
        return
    }

    Column {
        Text(
            text = "Log Sleep",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = state.sleepNightOf,
            onValueChange = onNightOfChange,
            label = { Text("Night of (date)") },
            placeholder = { Text("YYYY-MM-DD") },
            singleLine = true,
            isError = state.sleepError != null,
            supportingText = state.sleepError?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(20.dp))

        Text(
            text = "Hours slept: %.1f".format(state.sleepHours),
            style = MaterialTheme.typography.titleSmall,
        )
        Spacer(Modifier.height(4.dp))
        Slider(
            value = state.sleepHours.toFloat(),
            onValueChange = { onHoursChange(it.toDouble()) },
            valueRange = 0f..24f,
            steps = 23,
            modifier = Modifier.fillMaxWidth(),
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("0h", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("24h", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = onSave,
            enabled = state.sleepNightOf.isNotBlank() && !state.isLoggingSleep,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state.isLoggingSleep) Text("Saving…") else Text("Log Sleep")
        }

        Spacer(Modifier.height(8.dp))

        OutlinedButton(onClick = onDone, modifier = Modifier.fillMaxWidth()) {
            Text("Cancel")
        }
    }
}

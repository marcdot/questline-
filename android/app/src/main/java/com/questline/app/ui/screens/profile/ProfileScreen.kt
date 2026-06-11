package com.questline.app.ui.screens.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        delay(1000)
        viewModel.refreshCalendarStatus()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Settings",
                        style = MaterialTheme.typography.headlineMedium,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
        ) {
            // ── Account Section ──
            item {
                SectionLabel("Account")
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column {
                        SettingsRow(
                            label = "Email",
                            value = state.email ?: "—",
                            mono = true,
                        )
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                        SettingsAction(
                            label = "Sign out",
                            textColor = MaterialTheme.colorScheme.error,
                            enabled = !state.signingOut,
                            onClick = { viewModel.signOut() },
                        )
                    }
                }
            }

            // ── Google Calendar Section ──
            item {
                SectionLabel("Google Calendar")
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column {
                        SettingsRow(
                            label = "Status",
                            value = if (state.googleConnected) "Connected" else "Not connected",
                            contentColor = if (state.googleConnected)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                        state.statusMessage?.let { msg ->
                            Text(
                                text = msg,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                            )
                        }

                        SettingsAction(
                            label = if (state.googleConnected) "Disconnect Google Calendar" else "Connect Google Calendar",
                            textColor = if (state.googleConnected)
                                MaterialTheme.colorScheme.error
                            else
                                MaterialTheme.colorScheme.primary,
                            enabled = !state.connectingCalendar,
                            onClick = {
                                if (state.googleConnected) {
                                    viewModel.disconnectCalendar()
                                } else {
                                    viewModel.connectCalendar()
                                }
                            },
                        )
                    }
                }
            }

            // ── Display Section ──
            item {
                SectionLabel("Display")
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column {
                        ThemeRow(
                            label = "Theme",
                            selectedValue = state.theme,
                            options = listOf("light" to "Light", "dark" to "Dark"),
                            onSelect = { viewModel.setTheme(it) },
                        )
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                        ThemeRow(
                            label = "XP display",
                            selectedValue = state.xpMode,
                            options = listOf("total" to "Total", "period" to "Period"),
                            onSelect = { viewModel.setXpMode(it) },
                        )
                    }
                }
            }

            // ── Danger Zone ──
            item {
                SectionLabel("Danger zone", error = true)
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Column {
                        Text(
                            text = "Permanently delete your account and all data. This cannot be undone.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                        SettingsAction(
                            label = if (state.deleting) "Deleting…" else "Delete account",
                            textColor = MaterialTheme.colorScheme.error,
                            enabled = !state.deleting,
                            onClick = { viewModel.deleteAccount() },
                        )
                    }
                }
            }

            // Spacer for bottom nav
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

// ── Reusable sub-composables ──

@Composable
private fun SectionLabel(label: String, error: Boolean = false) {
    Text(
        text = label.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = if (error) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(start = 4.dp),
    )
}

@Composable
private fun SettingsRow(
    label: String,
    value: String,
    mono: Boolean = false,
    contentColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = contentColor,
            fontFamily = if (mono) FontFamily.Monospace else null,
        )
    }
}

@Composable
private fun SettingsAction(
    label: String,
    textColor: Color,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    TextButton(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp),
    ) {
        Text(
            text = label,
            color = textColor.copy(alpha = if (enabled) 1f else 0.5f),
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
private fun ThemeRow(
    label: String,
    selectedValue: String,
    options: List<Pair<String, String>>,
    onSelect: (String) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (key, labelText) ->
                FilterChip(
                    selected = selectedValue == key,
                    onClick = { onSelect(key) },
                    label = {
                        Text(
                            labelText,
                            style = MaterialTheme.typography.labelMedium,
                        )
                    },
                )
            }
        }
    }
}

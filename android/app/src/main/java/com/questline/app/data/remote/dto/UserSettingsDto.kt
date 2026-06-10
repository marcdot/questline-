package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO matching docs/02 user_settings table (1:1 with user).
 */
@Serializable
data class UserSettingsDto(
    @SerialName("user_id")
    val userId: String,
    val theme: ThemePref = ThemePref.SYSTEM,
    @SerialName("xp_display")
    val xpDisplay: XpDisplay = XpDisplay.SIMPLE,
    @SerialName("calendar_sync_enabled")
    val calendarSyncEnabled: Boolean = false,
    @SerialName("reminders_enabled")
    val remindersEnabled: Boolean = true,
    @SerialName("google_connected")
    val googleConnected: Boolean = false,
    @SerialName("updated_at")
    val updatedAt: String
)

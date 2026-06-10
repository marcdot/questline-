package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO matching docs/02 quest table.
 *
 * INVARIANTS:
 * - If cadence ≥ weekly and weekdays non-empty → daily child quests are generated on those weekdays.
 * - If weekdays empty → only the aggregate quest exists; no children.
 * - A generated child always has cadence = daily, inherits habit_id, title, target_count, unit.
 * - weekdays sorted chronologically mon→sun (contract).
 */
@Serializable
data class QuestDto(
    val id: String,
    @SerialName("user_id")
    val userId: String,
    @SerialName("habit_id")
    val habitId: String? = null,
    val title: String,
    val cadence: Cadence,
    @SerialName("target_count")
    val targetCount: Int = 1,
    val unit: String? = null,
    val weekdays: List<Weekday> = emptyList(),
    @SerialName("generated_parent_id")
    val generatedParentId: String? = null,
    @SerialName("calendar_sync")
    val calendarSync: Boolean = false,
    @SerialName("reminder_time")
    val reminderTime: String? = null,
    @SerialName("active_from")
    val activeFrom: String,
    @SerialName("active_to")
    val activeTo: String? = null,
    val archived: Boolean = false,
    @SerialName("created_at")
    val createdAt: String
)

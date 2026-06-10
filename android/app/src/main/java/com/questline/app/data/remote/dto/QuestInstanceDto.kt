package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO matching docs/02 quest_instance table.
 *
 * One occurrence of a quest in its period — what the user actually taps.
 * INVARIANTS:
 * - Unique (quest_id, period_key) — exactly one instance per quest per period.
 * - completed == (progress >= target_count); both kept consistent server-side.
 * - period_key format per docs/05 §Period keys.
 */
@Serializable
data class QuestInstanceDto(
    val id: String,
    @SerialName("user_id")
    val userId: String,
    @SerialName("quest_id")
    val questId: String,
    @SerialName("period_key")
    val periodKey: String,
    val progress: Int = 0,
    @SerialName("target_count")
    val targetCount: Int,
    val completed: Boolean = false,
    @SerialName("completed_at")
    val completedAt: String? = null,
    @SerialName("created_at")
    val createdAt: String
)

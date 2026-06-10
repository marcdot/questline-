package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO matching docs/02 habit table.
 * A quest's display colour is always derived from its habit, never stored on the quest.
 */
@Serializable
data class HabitDto(
    val id: String,
    @SerialName("user_id")
    val userId: String,
    val name: String,
    val color: String,
    @SerialName("sort_order")
    val sortOrder: Int = 0,
    val archived: Boolean = false,
    @SerialName("created_at")
    val createdAt: String
)

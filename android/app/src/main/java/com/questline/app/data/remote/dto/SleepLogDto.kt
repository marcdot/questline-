package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO matching docs/02 sleep_log table.
 *
 * INVARIANT: unique (user_id, night_of) — one sleep figure per night (upsert).
 */
@Serializable
data class SleepLogDto(
    val id: String,
    @SerialName("user_id")
    val userId: String,
    @SerialName("night_of")
    val nightOf: String,
    val hours: Double,
    @SerialName("created_at")
    val createdAt: String
)

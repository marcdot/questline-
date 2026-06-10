package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO matching docs/02 streak table.
 *
 * One row per quest; stored for cheap reads, recomputed on change.
 * INVARIANT: recomputed by the rule in docs/05 §Streaks whenever an instance completes/uncompletes.
 */
@Serializable
data class StreakDto(
    val id: String,
    @SerialName("user_id")
    val userId: String,
    @SerialName("quest_id")
    val questId: String,
    val current: Int = 0,
    val longest: Int = 0,
    @SerialName("last_period_key")
    val lastPeriodKey: String? = null
)

package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO matching docs/02 xp_event table.
 *
 * XP ledger; balance is the sum of all xp_event.amount rows.
 * Clients never write xp_event directly (RLS forbids it) — only the apply_quest_event RPC does.
 */
@Serializable
data class XpEventDto(
    val id: String,
    @SerialName("user_id")
    val userId: String,
    @SerialName("source_instance_id")
    val sourceInstanceId: String? = null,
    val amount: Int,
    val reason: String,
    @SerialName("created_at")
    val createdAt: String
)

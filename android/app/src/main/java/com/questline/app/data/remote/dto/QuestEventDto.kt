package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO matching docs/02 quest_event table.
 *
 * Idempotent ledger of interactions — powers offline replay safety.
 * INVARIANT: Server applies each id at most once (dedupe). Re-sending the queue is a no-op.
 */
@Serializable
data class QuestEventDto(
    val id: String,
    @SerialName("user_id")
    val userId: String,
    @SerialName("instance_id")
    val instanceId: String,
    val kind: EventKind,
    val delta: Int,
    @SerialName("created_at")
    val createdAt: String
)

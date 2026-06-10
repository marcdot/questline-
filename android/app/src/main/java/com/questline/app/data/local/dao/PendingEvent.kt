package com.questline.app.data.local.dao

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for the offline event queue.
 * Events that fail to send (offline) are stored here and flushed on reconnect.
 */
@Entity(tableName = "pending_event")
data class PendingEvent(
    @PrimaryKey val id: String,                    // client-generated UUID (idempotency key)
    val eventType: String,             // "apply_quest_event", "log_sleep"
    val payloadJson: String,           // serialized parameters
    val createdAt: Long,               // epoch millis
    val retryCount: Int = 0
)

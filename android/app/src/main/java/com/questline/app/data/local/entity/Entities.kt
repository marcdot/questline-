package com.questline.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for caching quest instances locally (offline-accessible).
 * Mirrors the quest_instance table from docs/02.
 */
@Entity(tableName = "quest_instance")
data class QuestInstanceEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val questId: String,
    val periodKey: String,
    val progress: Int = 0,
    val targetCount: Int,
    val completed: Boolean = false,
    val completedAt: String? = null,
    val createdAt: String
)

/**
 * Room entity for caching habits locally.
 */
@Entity(tableName = "habit")
data class HabitEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val name: String,
    val color: String,
    val sortOrder: Int = 0,
    val archived: Boolean = false,
    val createdAt: String
)

/**
 * Room entity for caching quests locally.
 */
@Entity(tableName = "quest")
data class QuestEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val habitId: String? = null,
    val title: String,
    val cadence: String,
    val targetCount: Int = 1,
    val unit: String? = null,
    val weekdays: String = "", // JSON-encoded list of weekday strings
    val generatedParentId: String? = null,
    val calendarSync: Boolean = false,
    val reminderTime: String? = null,
    val activeFrom: String,
    val activeTo: String? = null,
    val archived: Boolean = false,
    val createdAt: String
)

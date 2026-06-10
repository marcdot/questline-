package com.questline.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.questline.app.data.local.entity.HabitEntity
import com.questline.app.data.local.entity.QuestEntity
import com.questline.app.data.local.entity.QuestInstanceEntity

/**
 * DAO for the offline cache (habits, quests, instances).
 */
@Dao
interface CacheDao {

    // ── Habit cache ──

    @Query("SELECT * FROM habit WHERE userId = :userId AND archived = 0")
    suspend fun getHabits(userId: String): List<HabitEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHabits(habits: List<HabitEntity>)

    @Query("DELETE FROM habit WHERE userId = :userId")
    suspend fun clearHabits(userId: String)

    // ── Quest cache ──

    @Query("SELECT * FROM quest WHERE userId = :userId AND archived = 0")
    suspend fun getQuests(userId: String): List<QuestEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertQuests(quests: List<QuestEntity>)

    @Query("DELETE FROM quest WHERE userId = :userId")
    suspend fun clearQuests(userId: String)

    // ── Quest instance cache ──

    @Query("SELECT * FROM quest_instance WHERE userId = :userId AND periodKey = :periodKey")
    suspend fun getInstancesForPeriod(userId: String, periodKey: String): List<QuestInstanceEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertInstances(instances: List<QuestInstanceEntity>)

    @Query("DELETE FROM quest_instance WHERE userId = :userId")
    suspend fun clearInstances(userId: String)

    @Query("UPDATE quest_instance SET progress = :progress, completed = :completed, completedAt = :completedAt WHERE id = :instanceId")
    suspend fun updateInstance(instanceId: String, progress: Int, completed: Boolean, completedAt: String?)
}

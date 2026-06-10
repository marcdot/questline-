package com.questline.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface OfflineQueueDao {

    @Query("SELECT * FROM pending_event ORDER BY createdAt ASC")
    suspend fun getAllPending(): List<PendingEvent>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: PendingEvent)

    @Query("DELETE FROM pending_event WHERE id = :eventId")
    suspend fun delete(eventId: String)

    @Query("UPDATE pending_event SET retryCount = retryCount + 1 WHERE id = :eventId")
    suspend fun incrementRetry(eventId: String)

    @Query("SELECT COUNT(*) FROM pending_event")
    suspend fun pendingCount(): Int
}

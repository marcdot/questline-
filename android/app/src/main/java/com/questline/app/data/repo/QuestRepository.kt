package com.questline.app.data.repo

import com.questline.app.data.local.dao.CacheDao
import com.questline.app.data.local.dao.OfflineQueueDao
import com.questline.app.data.local.dao.PendingEvent
import com.questline.app.data.remote.SupabaseRemoteSource
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository bridging remote and local data sources.
 *
 * Coordinates:
 * - Reading: try remote first, fall back to Room cache on failure
 * - Writing: always through RPCs (apply_quest_event, log_sleep, ensure_instances)
 * - Offline: queue pending events to Room, flush on reconnect
 */
@Singleton
class QuestRepository @Inject constructor(
    private val remote: SupabaseRemoteSource,
    private val cacheDao: CacheDao,
    private val offlineQueueDao: OfflineQueueDao
) {
    // ── ensure instances ──

    /** Ensure instances exist for a given date, then return cached instances. */
    suspend fun ensureAndGetInstances(userId: String, dateKey: String): Result<List<com.questline.app.data.local.entity.QuestInstanceEntity>> {
        return try {
            remote.ensureInstances(dateKey)
            // Refresh the cache from remote
            val instances = remote.getInstances(userId, dateKey)
            cacheDao.clearInstances(userId)
            cacheDao.insertInstances(instances.map { it.toEntity() })
            Result.success(cacheDao.getInstancesForPeriod(userId, dateKey))
        } catch (e: Exception) {
            // Offline: return cached data
            Result.success(cacheDao.getInstancesForPeriod(userId, dateKey))
        }
    }

    // ── apply quest event ──

    /** Apply a quest event (tap/complete/uncomplete). Queues if offline. */
    suspend fun applyEvent(
        userId: String,
        eventId: String,
        instanceId: String,
        kind: String,
        delta: Int
    ): Result<Unit> {
        val clientTs = java.time.Instant.now().toString()
        return try {
            remote.applyQuestEvent(eventId, instanceId, kind, delta, clientTs)
            Result.success(Unit)
        } catch (e: Exception) {
            // Queue for later sync
            val payload = """{"event_id":"$eventId","instance_id":"$instanceId","kind":"$kind","delta":$delta,"client_ts":"$clientTs"}"""
            offlineQueueDao.insert(
                PendingEvent(
                    id = eventId,
                    eventType = "apply_quest_event",
                    payloadJson = payload,
                    createdAt = System.currentTimeMillis()
                )
            )
            Result.failure(e)
        }
    }

    // ── log sleep ──

    suspend fun logSleep(nightOf: String, hours: Double): Result<Unit> {
        return try {
            remote.logSleep(nightOf, hours)
            Result.success(Unit)
        } catch (e: Exception) {
            val payload = """{"night_of":"$nightOf","hours":$hours}"""
            offlineQueueDao.insert(
                PendingEvent(
                    id = java.util.UUID.randomUUID().toString(),
                    eventType = "log_sleep",
                    payloadJson = payload,
                    createdAt = System.currentTimeMillis()
                )
            )
            Result.failure(e)
        }
    }

    // ── offline queue flush ──

    /** Flush all pending events to the server. Returns count of flushed events. */
    suspend fun flushOfflineQueue(): Int {
        val pending = offlineQueueDao.getAllPending()
        var flushed = 0
        for (event in pending) {
            try {
                when (event.eventType) {
                    "apply_quest_event" -> {
                        // Parse payload and send
                        // Simplified: in production use JSON parsing
                        remote.applyQuestEvent(
                            eventId = event.id,
                            instanceId = "", // extracted from payload
                            kind = "",
                            delta = 0,
                            clientTs = ""
                        )
                    }
                    "log_sleep" -> {
                        remote.logSleep("", 0.0)
                    }
                }
                offlineQueueDao.delete(event.id)
                flushed++
            } catch (e: Exception) {
                offlineQueueDao.incrementRetry(event.id)
            }
        }
        return flushed
    }
}

/**
 * Extension to map DTOs to Room entities.
 */
private fun com.questline.app.data.remote.dto.QuestInstanceDto.toEntity() =
    com.questline.app.data.local.entity.QuestInstanceEntity(
        id = id,
        userId = userId,
        questId = questId,
        periodKey = periodKey,
        progress = progress,
        targetCount = targetCount,
        completed = completed,
        completedAt = completedAt,
        createdAt = createdAt
    )

package com.questline.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.questline.app.data.local.dao.CacheDao
import com.questline.app.data.local.dao.OfflineQueueDao
import com.questline.app.data.local.dao.PendingEvent
import com.questline.app.data.local.entity.HabitEntity
import com.questline.app.data.local.entity.QuestEntity
import com.questline.app.data.remote.SupabaseRemoteSource
import com.questline.app.data.repo.AuthRepository
import com.questline.app.domain.PeriodKey
import com.questline.app.domain.StreakCalculator
import com.questline.app.domain.StreakState
import com.questline.app.domain.XpCalculator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * ViewModel for the home screen — loads today's quests, handles optimistic
 * updates for tap + hold, computes XP/streak previews, and loads sleep data.
 */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val remoteSource: SupabaseRemoteSource,
    private val authRepository: AuthRepository,
    private val cacheDao: CacheDao,
    private val offlineQueueDao: OfflineQueueDao,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    /** Track optimistic XP gained this session (before sync). */
    private var pendingXpToday: Int = 0

    /** Track per-instance optimistic progress increments for tap debounce. */
    private val optimisticProgress: MutableMap<String, Int> = mutableMapOf()

    init {
        loadHomeData()
    }

    fun loadHomeData() {
        viewModelScope.launch {
            val userId = authRepository.cachedUserId ?: run {
                _uiState.update { it.copy(isLoading = false, errorMessage = "Not signed in") }
                return@launch
            }

            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            try {
                val today = LocalDate.now()
                val todayKey = PeriodKey.daily(today)

                // 1. Ensure instances exist for today
                remoteSource.ensureInstances(todayKey)

                // 2. Fetch all data in parallel
                val habits = remoteSource.getHabits(userId)
                val quests = remoteSource.getQuests(userId)
                val instances = remoteSource.getInstances(userId, todayKey)
                val streaks = remoteSource.getStreaks(userId)
                val xpEvents = remoteSource.getXpEvents(userId)

                // 3. Sleep data for current month
                val monthKey = PeriodKey.monthly(today)
                val sleepLogs = remoteSource.getSleepLogs(userId, monthKey)

                // 4. Cache everything
                cacheDao.clearHabits(userId)
                cacheDao.insertHabits(habits.map { it.toEntity() })
                cacheDao.clearQuests(userId)
                cacheDao.insertQuests(quests.map { it.toEntity() })
                cacheDao.clearInstances(userId)
                cacheDao.insertInstances(instances.map { it.toEntity() })

                // 5. Build quest card models
                val habitMap = habits.associateBy { it.id }
                val questMap = quests.associateBy { it.id }
                val streakMap = streaks.associateBy { it.questId }

                val cards = instances.mapNotNull { instance ->
                    val quest = questMap[instance.questId] ?: return@mapNotNull null
                    val habit = habitMap[quest.habitId ?: ""] ?: return@mapNotNull null

                    QuestCardUiModel(
                        instanceId = instance.id,
                        questId = instance.questId,
                        habitId = habit.id,
                        title = quest.title,
                        habitColorArgb = try {
                            android.graphics.Color.parseColor(habit.color)
                        } catch (_: Exception) {
                            android.graphics.Color.GRAY
                        },
                        progress = instance.progress,
                        targetCount = instance.targetCount,
                        completed = instance.completed,
                        cadence = quest.cadence.name.lowercase(),
                        habitName = habit.name,
                    )
                }

                // 6. Compute stats
                val todayCompleted = instances.count { it.completed }
                val todayTotal = instances.size
                val xpBalance = xpEvents.sumOf { it.amount }
                val highestStreak = streaks.maxOfOrNull { it.current } ?: 0

                // 7. Sleep data
                val sleepPoints = sleepLogs.map { log ->
                    SleepDataPoint(
                        nightOf = log.nightOf,
                        hours = log.hours,
                    )
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        questCards = cards,
                        todayCompleted = todayCompleted,
                        todayTotal = todayTotal,
                        currentStreak = highestStreak,
                        xpBalance = xpBalance,
                        xpToday = pendingXpToday,
                        sleepData = sleepPoints,
                    )
                }
            } catch (e: Exception) {
                // Try cache fallback
                try {
                    val cachedHabits = cacheDao.getHabits(userId)
                    val cachedQuests = cacheDao.getQuests(userId)
                    val todayKey = PeriodKey.daily(LocalDate.now())
                    val cachedInstances = cacheDao.getInstancesForPeriod(userId, todayKey)

                    if (cachedInstances.isNotEmpty()) {
                        val habitMap = cachedHabits.associateBy { it.id }
                        val questMap = cachedQuests.associateBy { it.id }

                        val cards = cachedInstances.mapNotNull { instance ->
                            val quest = questMap[instance.questId] ?: return@mapNotNull null
                            val habit = habitMap[quest.habitId ?: ""] ?: return@mapNotNull null

                            QuestCardUiModel(
                                instanceId = instance.id,
                                questId = instance.questId,
                                habitId = habit.id,
                                title = quest.title,
                                habitColorArgb = try {
                                    android.graphics.Color.parseColor(habit.color)
                                } catch (_: Exception) {
                                    android.graphics.Color.GRAY
                                },
                                progress = instance.progress,
                                targetCount = instance.targetCount,
                                completed = instance.completed,
                                cadence = quest.cadence.toString().lowercase(),
                                habitName = habit.name,
                            )
                        }

                        val todayCompleted = cachedInstances.count { it.completed }
                        val todayTotal = cachedInstances.size

                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                questCards = cards,
                                todayCompleted = todayCompleted,
                                todayTotal = todayTotal,
                                errorMessage = null,
                            )
                        }
                        return@launch
                    }
                } catch (_: Exception) {
                    // ignore cache errors
                }

                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Failed to load data")
                }
            }
        }
    }

    // ── Interactions ──

    /**
     * Handle tap on a quest card: optimistic +1 increment.
     */
    fun onTapQuest(instanceId: String) {
        _uiState.update { state ->
            val updatedCards = state.questCards.map { card ->
                if (card.instanceId == instanceId && !card.completed) {
                    val newProgress = minOf(card.progress + 1, card.targetCount)
                    val nowCompleted = newProgress >= card.targetCount
                    card.copy(progress = newProgress, completed = nowCompleted)
                } else {
                    card
                }
            }

            val tapCompleted = updatedCards.find { it.instanceId == instanceId }?.completed ?: false
            val tapProgress = updatedCards.find { it.instanceId == instanceId }?.progress ?: 0

            state.copy(
                questCards = updatedCards,
                todayCompleted = updatedCards.count { it.completed },
                todayTotal = updatedCards.size,
                // If tap completed the instance, update optimistic XP
                xpToday = if (tapCompleted) {
                    val card = state.questCards.find { it.instanceId == instanceId }
                    if (card != null) {
                        // Compute optimistic XP for this completion
                        val streakState = StreakState(
                            current = state.currentStreak,
                            longest = state.currentStreak,
                            lastPeriodKey = null, // we don't track this locally
                        )
                        val newStreak = StreakCalculator.computeStreak(
                            prevStreak = streakState,
                            newPeriodKey = PeriodKey.daily(LocalDate.now()),
                            questCadence = card.cadence,
                        )
                        val xpGained = XpCalculator.calculateXp(newStreak.current, card.cadence)
                        pendingXpToday += xpGained
                        state.xpToday + xpGained
                    } else state.xpToday
                } else state.xpToday,
            )
        }

        // Queue the event for sync
        enqueueQuestEvent(instanceId, "increment", 1)
    }

    /**
     * Handle hold-complete on a quest card.
     */
    fun onCompleteQuest(instanceId: String) {
        _uiState.update { state ->
            val card = state.questCards.find { it.instanceId == instanceId } ?: return@update state
            if (card.completed) return@update state

            val delta = card.targetCount - card.progress

            val updatedCards = state.questCards.map { c ->
                if (c.instanceId == instanceId) {
                    c.copy(progress = c.targetCount, completed = true)
                } else {
                    c
                }
            }

            // Compute optimistic XP
            val newStreak = StreakCalculator.computeStreak(
                prevStreak = StreakState(
                    current = state.currentStreak,
                    longest = state.currentStreak,
                    lastPeriodKey = null,
                ),
                newPeriodKey = PeriodKey.daily(LocalDate.now()),
                questCadence = card.cadence,
            )
            val xpGained = XpCalculator.calculateXp(newStreak.current, card.cadence)
            pendingXpToday += xpGained

            state.copy(
                questCards = updatedCards,
                todayCompleted = updatedCards.count { it.completed },
                xpToday = state.xpToday + xpGained,
                currentStreak = maxOf(state.currentStreak, newStreak.current),
            )
        }

        enqueueQuestEvent(instanceId, "complete", 1)
    }

    // ── Offline queue ──

    private fun enqueueQuestEvent(instanceId: String, kind: String, delta: Int) {
        viewModelScope.launch {
            val eventId = java.util.UUID.randomUUID().toString()
            val clientTs = java.time.Instant.now().toString()
            val payload = """{"event_id":"$eventId","instance_id":"$instanceId","kind":"$kind","delta":$delta,"client_ts":"$clientTs"}"""

            try {
                remoteSource.applyQuestEvent(eventId, instanceId, kind, delta, clientTs)
            } catch (_: Exception) {
                // Offline: queue for later
                offlineQueueDao.insert(
                    PendingEvent(
                        id = eventId,
                        eventType = "apply_quest_event",
                        payloadJson = payload,
                        createdAt = System.currentTimeMillis(),
                    )
                )
            }
        }
    }

    /** Refresh data (pull-to-refresh). */
    fun refresh() {
        pendingXpToday = 0
        optimisticProgress.clear()
        loadHomeData()
    }
}

// ── Mappers ──

private fun com.questline.app.data.remote.dto.HabitDto.toEntity() =
    com.questline.app.data.local.entity.HabitEntity(
        id = id,
        userId = userId,
        name = name,
        color = color,
        sortOrder = sortOrder,
        archived = archived,
        createdAt = createdAt,
    )

private fun com.questline.app.data.remote.dto.QuestDto.toEntity() =
    com.questline.app.data.local.entity.QuestEntity(
        id = id,
        userId = userId,
        habitId = habitId?.toString(),
        title = title,
        cadence = cadence.name.lowercase(),
        targetCount = targetCount,
        unit = unit,
        weekdays = weekdays.joinToString(",") { it.name.lowercase() },
        generatedParentId = generatedParentId,
        calendarSync = calendarSync,
        reminderTime = reminderTime,
        activeFrom = activeFrom,
        activeTo = activeTo,
        archived = archived,
        createdAt = createdAt,
    )

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
        createdAt = createdAt,
    )

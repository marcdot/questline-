package com.questline.app.data.remote

import com.questline.app.data.remote.dto.HabitDto
import com.questline.app.data.remote.dto.QuestDto
import com.questline.app.data.remote.dto.QuestInstanceDto
import com.questline.app.data.remote.dto.StreakDto
import com.questline.app.data.remote.dto.XpEventDto
import com.questline.app.data.remote.dto.SleepLogDto
import com.questline.app.BuildConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.request.*
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Supabase remote data source using raw Ktor HTTP calls.
 *
 * Endpoints:
 *   REST:  POST/GET /rest/v1/{table}?select=...  (anon key in apikey header)
 *   RPC:   POST /rest/v1/rpc/{fn}
 *   Auth:  POST /auth/v1/...
 *
 * When [accessToken] is set (by [AuthRepository] after login), all table/RPC calls
 * use the authenticated Bearer token so RLS policies apply.
 */
@Singleton
class SupabaseRemoteSource @Inject constructor() {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val client = HttpClient(OkHttp)

    private val baseUrl: String get() = BuildConfig.SUPABASE_URL
    private val anonKey: String get() = BuildConfig.SUPABASE_ANON_KEY

    /**
     * The Bearer auth token. Set to the user's access token after sign-in.
     * When null, the anon key is used (unauthenticated requests).
     */
    var accessToken: String? = null

    /** Default headers for table/RPC calls. */
    private fun HttpRequestBuilder.supaHeaders() {
        header("apikey", anonKey)
        header("Authorization", "Bearer ${accessToken ?: anonKey}")
        contentType(ContentType.Application.Json)
    }

    /** Execute a Supabase REST query that returns rows. */
    private suspend inline fun <reified T> query(
        table: String,
        select: String = "*",
        vararg filters: Pair<String, String>,
    ): List<T> {
        val url = "$baseUrl/rest/v1/$table?select=$select"
        val response = client.get(url) {
            supaHeaders()
            for ((k, v) in filters) {
                parameter(k, v)
            }
        }
        val body = response.body<String>()
        return json.decodeFromString(body)
    }

    /** Execute an RPC call that returns a JSON object. */
    private suspend fun rpc(name: String, body: JsonObject): JsonObject? {
        val url = "$baseUrl/rest/v1/rpc/$name"
        val response = client.post(url) {
            supaHeaders()
            setBody(body.toString())
        }
        val text = response.body<String>()
        if (text.isBlank()) return null
        return try {
            json.decodeFromString(text)
        } catch (_: Exception) {
            null
        }
    }

    // ── Read paths ──

    suspend fun getHabits(userId: String): List<HabitDto> =
        query("habit", "*", "user_id" to "eq.$userId")

    suspend fun getQuests(userId: String): List<QuestDto> =
        query("quest", "*", "user_id" to "eq.$userId")

    suspend fun getInstances(userId: String, periodKey: String): List<QuestInstanceDto> =
        query("quest_instance", "*", "user_id" to "eq.$userId", "period_key" to "eq.$periodKey")

    suspend fun getInstancesForRange(userId: String, periodKeyStart: String, periodKeyEnd: String): List<QuestInstanceDto> =
        query("quest_instance", "*",
            "user_id" to "eq.$userId",
            "period_key" to "gte.$periodKeyStart",
            "period_key" to "lte.$periodKeyEnd")

    suspend fun getXpEvents(userId: String): List<XpEventDto> =
        query("xp_event", "*", "user_id" to "eq.$userId")

    suspend fun getXpEventsForRange(userId: String, startDate: String, endDate: String): List<XpEventDto> =
        query("xp_event", "*",
            "user_id" to "eq.$userId",
            "created_at" to "gte.$startDate",
            "created_at" to "lte.$endDate")

    suspend fun getStreaks(userId: String): List<StreakDto> =
        query("streak", "*", "user_id" to "eq.$userId")

    suspend fun getSleepLogs(userId: String, month: String): List<SleepLogDto> {
        val start = "$month-01"
        val parts = month.split("-")
        val y = parts[0].toInt()
        val m = parts[1].toInt()
        val nextMonth = if (m == 12) "${y + 1}-01" else "%04d-%02d".format(y, m + 1)
        return query("sleep_log", "*",
            "user_id" to "eq.$userId",
            "night_of" to "gte.$start",
            "night_of" to "lt.$nextMonth")
    }

    suspend fun getXpBalance(userId: String): Int =
        getXpEvents(userId).sumOf { it.amount }

    // ── Write paths (inserts for onboarding) ──

    /**
     * Create a new habit. Returns the created [HabitDto] or null on failure.
     */
    suspend fun insertHabit(name: String, color: String): HabitDto? {
        val url = "$baseUrl/rest/v1/habit?select=*"
        val response = client.post(url) {
            supaHeaders()
            setBody("""{"name":"$name","color":"$color"}""")
        }
        val text = response.bodyAsText()
        if (response.status.isSuccess() && text.isNotBlank()) {
            return try {
                val list: List<HabitDto> = json.decodeFromString(text)
                list.firstOrNull()
            } catch (_: Exception) {
                json.decodeFromString<HabitDto>(text)
            }
        }
        return null
    }

    /**
     * Create a new quest. Returns the created [QuestDto] or null on failure.
     *
     * Supports optional [weekdays] (sorted mon→sun), [calendarSync], [targetCount], [unit].
     */
    suspend fun insertQuest(
        habitId: String,
        title: String,
        cadence: String,
        targetCount: Int = 1,
        unit: String? = null,
        weekdays: List<String> = emptyList(),
        calendarSync: Boolean = false,
    ): QuestDto? {
        val url = "$baseUrl/rest/v1/quest?select=*"
        val today = java.time.LocalDate.now().toString()
        val body = buildJsonObject {
            put("habit_id", habitId)
            put("title", title)
            put("cadence", cadence)
            put("target_count", targetCount)
            if (unit != null) put("unit", unit)
            put("active_from", today)
            if (weekdays.isNotEmpty()) {
                putJsonArray("weekdays") {
                    weekdays.forEach { add(JsonPrimitive(it)) }
                }
            }
            put("calendar_sync", calendarSync)
        }
        val response = client.post(url) {
            supaHeaders()
            setBody(body.toString())
        }
        val text = response.bodyAsText()
        if (response.status.isSuccess() && text.isNotBlank()) {
            return try {
                val list: List<QuestDto> = json.decodeFromString(text)
                list.firstOrNull()
            } catch (_: Exception) {
                json.decodeFromString<QuestDto>(text)
            }
        }
        return null
    }

    // ── Write paths (RPCs only) ──

    suspend fun applyQuestEvent(
        eventId: String,
        instanceId: String,
        kind: String,
        delta: Int,
        clientTs: String
    ): JsonObject? = rpc("apply_quest_event", buildJsonObject {
        put("p_event_id", eventId)
        put("p_instance_id", instanceId)
        put("p_kind", kind)
        put("p_delta", delta)
        put("p_client_ts", clientTs)
    })

    suspend fun ensureInstances(date: String): JsonObject? =
        rpc("ensure_instances", buildJsonObject {
            put("p_date", date)
        })

    suspend fun logSleep(nightOf: String, hours: Double): JsonObject? =
        rpc("log_sleep", buildJsonObject {
            put("p_night_of", nightOf)
            put("p_hours", hours)
        })

    /**
     * Call generate_child_quests RPC for a weekly+ quest with weekdays.
     * Creates/updates daily child quests for each weekday per docs/05 §2.
     */
    suspend fun generateChildQuests(questId: String): JsonObject? =
        rpc("generate_child_quests", buildJsonObject {
            put("p_quest_id", questId)
        })
}

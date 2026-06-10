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
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Supabase remote data source using raw Ktor HTTP calls.
 *
 * Calls the Supabase REST API directly (PostgREST + GoTrue Auth).
 * No supabase-kt dependency needed — avoids version/API mismatch issues.
 *
 * Endpoints:
 *   REST:  POST/GET {SUPABASE_URL}/rest/v1/{table}?select=...  (anon key in apikey header)
 *   RPC:   POST {SUPABASE_URL}/rest/v1/rpc/{fn}                 (anon key in apikey header)
 *   Auth:  POST {SUPABASE_URL}/auth/v1/...                      (anon key in apikey header)
 */
class SupabaseRemoteSource {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val client = HttpClient(OkHttp)

    private val baseUrl: String get() = BuildConfig.SUPABASE_URL
    private val anonKey: String get() = BuildConfig.SUPABASE_ANON_KEY

    /** Default headers for table/RPC calls. */
    private fun HttpRequestBuilder.supaHeaders() {
        header("apikey", anonKey)
        header("Authorization", "Bearer $anonKey")
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

    suspend fun getXpEvents(userId: String): List<XpEventDto> =
        query("xp_event", "*", "user_id" to "eq.$userId")

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

    // ── Write paths (RPCs only — never direct table writes) ──

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
}

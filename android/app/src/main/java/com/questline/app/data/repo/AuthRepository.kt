package com.questline.app.data.repo

import com.questline.app.BuildConfig
import com.questline.app.data.local.AuthStorage
import com.questline.app.data.remote.dto.AuthErrorResponse
import com.questline.app.data.remote.dto.AuthSessionResponse
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.request.*
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Authentication repository — email/password and Google sign-in via Supabase Auth REST API.
 *
 * Sessions are persisted in [AuthStorage] (encrypted prefs).
 * On every sign-in, the access token is propagated to [SupabaseRemoteSource] (set via [setAuthToken])
 * so subsequent data API calls use an authenticated Bearer token.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val authStorage: AuthStorage
) {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }
    private val client = HttpClient(OkHttp)

    private val baseUrl: String get() = BuildConfig.SUPABASE_URL
    private val anonKey: String get() = BuildConfig.SUPABASE_ANON_KEY

    /** Callback to set the auth token on the data source so data queries use Bearer auth. */
    var onAuthTokenChanged: ((String?) -> Unit)? = null

    // ── Auth state ──

    /** Whether a session exists in local storage. */
    val hasSession: Boolean get() = authStorage.hasSession

    /** The cached access token, if any. */
    val cachedAccessToken: String? get() = authStorage.accessToken

    /** The cached user id, if any. */
    val cachedUserId: String? get() = authStorage.userId

    /** The cached email, if any. */
    val cachedEmail: String? get() = authStorage.email

    // ── Sign up with email/password ──

    /** Sign up a new user with email and password. Returns success or error message. */
    suspend fun signUp(email: String, password: String): Result<AuthSessionResponse> {
        return try {
            val url = "$baseUrl/auth/v1/signup"
            val response = client.post(url) {
                header("apikey", anonKey)
                header("Authorization", "Bearer $anonKey")
                contentType(ContentType.Application.Json)
                setBody("""{"email":"$email","password":"$password"}""")
            }
            val body = response.bodyAsText()
            if (response.status.isSuccess()) {
                val session: AuthSessionResponse = json.decodeFromString(body)
                saveSession(session)
                Result.success(session)
            } else {
                val err = try { json.decodeFromString<AuthErrorResponse>(body) } catch (_: Exception) { null }
                Result.failure(Exception(err?.message ?: err?.errorDescription ?: "Sign up failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── Sign in with email/password ──

    /** Sign in with email and password. Returns success or error message. */
    suspend fun signIn(email: String, password: String): Result<AuthSessionResponse> {
        return try {
            val url = "$baseUrl/auth/v1/token?grant_type=password"
            val response = client.post(url) {
                header("apikey", anonKey)
                header("Authorization", "Bearer $anonKey")
                contentType(ContentType.Application.Json)
                setBody("""{"email":"$email","password":"$password"}""")
            }
            val body = response.bodyAsText()
            if (response.status.isSuccess()) {
                val session: AuthSessionResponse = json.decodeFromString(body)
                saveSession(session)
                Result.success(session)
            } else {
                val err = try { json.decodeFromString<AuthErrorResponse>(body) } catch (_: Exception) { null }
                Result.failure(Exception(err?.message ?: err?.errorDescription ?: "Sign in failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── Sign in with Google (via ID token) ──

    /**
     * Complete Google sign-in by exchanging a Google ID token with Supabase.
     * Call this after obtaining an ID token from GoogleSignInClient.
     */
    suspend fun signInWithGoogle(idToken: String): Result<AuthSessionResponse> {
        return try {
            val url = "$baseUrl/auth/v1/token?grant_type=id_token"
            val response = client.post(url) {
                header("apikey", anonKey)
                header("Authorization", "Bearer $anonKey")
                contentType(ContentType.Application.Json)
                setBody("""{"id_token":"$idToken","provider":"google"}""")
            }
            val body = response.bodyAsText()
            if (response.status.isSuccess()) {
                val session: AuthSessionResponse = json.decodeFromString(body)
                saveSession(session)
                Result.success(session)
            } else {
                val err = try { json.decodeFromString<AuthErrorResponse>(body) } catch (_: Exception) { null }
                Result.failure(Exception(err?.message ?: err?.errorDescription ?: "Google sign-in failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── Session refresh ──

    /**
     * Try to refresh the session using the stored refresh token.
     * Returns true if refresh succeeded.
     */
    suspend fun tryRefreshSession(): Boolean {
        val token = authStorage.refreshToken ?: return false
        return try {
            val url = "$baseUrl/auth/v1/token?grant_type=refresh_token"
            val response = client.post(url) {
                header("apikey", anonKey)
                header("Authorization", "Bearer $anonKey")
                contentType(ContentType.Application.Json)
                setBody("""{"refresh_token":"$token"}""")
            }
            val body = response.bodyAsText()
            if (response.status.isSuccess()) {
                val session: AuthSessionResponse = json.decodeFromString(body)
                saveSession(session)
                true
            } else {
                authStorage.clear()
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    // ── Sign out ──

    /** Sign out: invalidate session on the server and clear local storage. */
    suspend fun signOut(): Result<Unit> {
        return try {
            val token = authStorage.accessToken
            if (token != null) {
                val url = "$baseUrl/auth/v1/logout"
                client.post(url) {
                    header("apikey", anonKey)
                    header("Authorization", "Bearer $token")
                }
            }
            authStorage.clear()
            onAuthTokenChanged?.invoke(null)
            Result.success(Unit)
        } catch (e: Exception) {
            // Clear local session anyway
            authStorage.clear()
            onAuthTokenChanged?.invoke(null)
            Result.failure(e)
        }
    }

    // ── Internal ──

    private fun saveSession(session: AuthSessionResponse) {
        authStorage.accessToken = session.accessToken
        authStorage.refreshToken = session.refreshToken
        authStorage.userId = session.user?.id
        authStorage.email = session.user?.email
        onAuthTokenChanged?.invoke(session.accessToken)
    }
}

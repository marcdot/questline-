package com.questline.app.ui.screens.profile

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.questline.app.data.remote.SupabaseRemoteSource
import com.questline.app.data.repo.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import javax.inject.Inject

data class ProfileUiState(
    val email: String? = null,
    val userId: String? = null,
    val googleConnected: Boolean = false,
    val theme: String = "light",
    val xpMode: String = "total",
    val connectingCalendar: Boolean = false,
    val signingOut: Boolean = false,
    val deleting: Boolean = false,
    val statusMessage: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val app: Application,
    private val remoteSource: SupabaseRemoteSource,
    private val authRepository: AuthRepository,
) : AndroidViewModel(app) {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init {
        loadProfile()
    }

    private fun loadProfile() {
        val userId = authRepository.cachedUserId
        val email = authRepository.cachedEmail
        _state.value = _state.value.copy(
            userId = userId,
            email = email,
        )

        if (userId != null) {
            viewModelScope.launch {
                val settings = remoteSource.getUserSettings(userId)
                if (settings != null) {
                    _state.value = _state.value.copy(
                        googleConnected = settings["google_connected"]?.jsonPrimitive?.booleanOrNull ?: false,
                        theme = settings["theme"]?.jsonPrimitive?.contentOrNull ?: "light",
                        xpMode = settings["xp_mode"]?.jsonPrimitive?.contentOrNull ?: "total",
                    )
                }
            }
        }
    }

    /** Connect Google Calendar — open the consent URL in the browser. */
    fun connectCalendar() {
        _state.value = _state.value.copy(connectingCalendar = true, statusMessage = null)
        viewModelScope.launch {
            try {
                val redirectTo = "questline://profile"
                val url = remoteSource.getCalendarConsentUrl(redirectTo)
                if (url != null) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    app.startActivity(intent)
                    _state.value = _state.value.copy(
                        connectingCalendar = false,
                        statusMessage = "Complete the consent in your browser.",
                    )
                } else {
                    _state.value = _state.value.copy(
                        connectingCalendar = false,
                        statusMessage = "Failed to get consent URL.",
                    )
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    connectingCalendar = false,
                    statusMessage = "Error: ${e.message}",
                )
            }
        }
    }

    /** Disconnect Google Calendar — clear the user_settings flag. */
    fun disconnectCalendar() {
        val userId = _state.value.userId ?: return
        _state.value = _state.value.copy(connectingCalendar = true)
        viewModelScope.launch {
            val settings = buildJsonObject {
                put("google_connected", JsonPrimitive(false))
            }
            val ok = remoteSource.upsertUserSettings(userId, settings)
            _state.value = _state.value.copy(
                googleConnected = !ok, // optimistic update on success
                connectingCalendar = false,
                statusMessage = if (ok) "Disconnected." else "Failed to disconnect.",
            )
            if (ok) _state.value = _state.value.copy(googleConnected = false)
        }
    }

    /** Poll for google_connected after returning from OAuth. */
    fun refreshCalendarStatus() {
        val userId = _state.value.userId ?: return
        viewModelScope.launch {
            val settings = remoteSource.getUserSettings(userId)
            val connected = settings?.get("google_connected")?.jsonPrimitive?.booleanOrNull ?: false
            _state.value = _state.value.copy(
                googleConnected = connected,
                statusMessage = if (connected) "Calendar connected!" else null,
            )
        }
    }

    /** Toggle theme. */
    fun setTheme(theme: String) {
        _state.value = _state.value.copy(theme = theme)
        val userId = _state.value.userId ?: return
        viewModelScope.launch {
            remoteSource.upsertUserSettings(userId, buildJsonObject {
                put("theme", JsonPrimitive(theme))
            })
        }
    }

    /** Toggle XP display mode. */
    fun setXpMode(mode: String) {
        _state.value = _state.value.copy(xpMode = mode)
        val userId = _state.value.userId ?: return
        viewModelScope.launch {
            remoteSource.upsertUserSettings(userId, buildJsonObject {
                put("xp_mode", JsonPrimitive(mode))
            })
        }
    }

    /** Sign out. */
    fun signOut() {
        _state.value = _state.value.copy(signingOut = true)
        viewModelScope.launch {
            authRepository.signOut()
        }
    }

    /** Delete the user's account. (Requires an admin RPC.) */
    fun deleteAccount() {
        val userId = _state.value.userId ?: return
        _state.value = _state.value.copy(deleting = true)
        viewModelScope.launch {
            try {
                // Use the admin_delete_user RPC (if defined), otherwise sign out
                // For now, just sign out
                authRepository.signOut()
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    deleting = false,
                    statusMessage = "Delete failed: ${e.message}",
                )
            }
        }
    }
}

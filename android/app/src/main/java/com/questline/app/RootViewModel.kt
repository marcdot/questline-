package com.questline.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.questline.app.data.repo.AuthRepository
import com.questline.app.data.remote.SupabaseRemoteSource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Top-level navigation state.
 */
sealed class AppDestination {
    data object Loading : AppDestination()
    data object Auth : AppDestination()
    data object Onboarding : AppDestination()
    data object Home : AppDestination()
}

/**
 * Root ViewModel that determines the initial app destination
 * based on auth state and onboarding completion.
 */
@HiltViewModel
class RootViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val remoteSource: SupabaseRemoteSource,
) : ViewModel() {

    private val _destination = MutableStateFlow<AppDestination>(AppDestination.Loading)
    val destination: StateFlow<AppDestination> = _destination.asStateFlow()

    init {
        checkAuthState()
    }

    private fun checkAuthState() {
        viewModelScope.launch {
            if (!authRepository.hasSession) {
                _destination.value = AppDestination.Auth
                return@launch
            }

            // Try to refresh the session
            val refreshed = authRepository.tryRefreshSession()
            if (!refreshed) {
                _destination.value = AppDestination.Auth
                return@launch
            }

            // User is authenticated. Check if they have completed onboarding
            // (at least one habit exists).
            val userId = authRepository.cachedUserId
            if (userId == null) {
                _destination.value = AppDestination.Auth
                return@launch
            }

            try {
                val habits = remoteSource.getHabits(userId)
                if (habits.isEmpty()) {
                    _destination.value = AppDestination.Onboarding
                } else {
                    _destination.value = AppDestination.Home
                }
            } catch (e: Exception) {
                // If we can't check habits (offline), assume onboarded
                _destination.value = AppDestination.Home
            }
        }
    }

    /** Called after sign-in completes — re-check state. */
    fun onSignedIn() {
        checkAuthState()
    }

    /** Called after onboarding completes — go to home. */
    fun onOnboardingComplete() {
        _destination.value = AppDestination.Home
    }
}

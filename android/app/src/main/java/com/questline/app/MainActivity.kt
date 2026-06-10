package com.questline.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.questline.app.ui.screens.auth.AuthScreen
import com.questline.app.ui.screens.auth.AuthViewModel
import com.questline.app.ui.screens.onboarding.OnboardingScreen
import com.questline.app.ui.screens.onboarding.OnboardingViewModel
import com.questline.app.ui.theme.QuestlineTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Single-activity entry point.
 *
 * BUILD.md: single-activity, Compose Navigation, Material 3 theme.
 * P2: routes between Auth → Onboarding → Home based on session state.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            QuestlineTheme {
                AppRoot()
            }
        }
    }
}

/**
 * Root composable that observes auth state and displays the correct screen:
 *   Loading → Auth → Onboarding → Home (MainScreen)
 */
@Composable
private fun AppRoot() {
    val rootViewModel: RootViewModel = hiltViewModel()
    val destination by rootViewModel.destination.collectAsState()

    when (destination) {
        AppDestination.Loading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }

        AppDestination.Auth -> {
            val authViewModel: AuthViewModel = hiltViewModel()
            AuthScreen(
                viewModel = authViewModel,
                onSignedIn = rootViewModel::onSignedIn,
            )
        }

        AppDestination.Onboarding -> {
            val onboardingViewModel: OnboardingViewModel = hiltViewModel()
            OnboardingScreen(
                viewModel = onboardingViewModel,
                onComplete = rootViewModel::onOnboardingComplete,
            )
        }

        AppDestination.Home -> {
            MainScreen()
        }
    }
}

package com.questline.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.questline.app.ui.theme.QuestlineTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Single-activity entry point.
 *
 * BUILD.md: single-activity, Compose Navigation, Material 3 theme.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            QuestlineTheme {
                MainScreen()
            }
        }
    }
}

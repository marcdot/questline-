package com.questline.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = LightAccent,
    onPrimary = Color.White,
    primaryContainer = LightSurface2,
    onPrimaryContainer = LightText,
    secondary = LightTextMuted,
    onSecondary = Color.White,
    background = LightBg,
    onBackground = LightText,
    surface = LightSurface,
    onSurface = LightText,
    surfaceVariant = LightSurface2,
    onSurfaceVariant = LightTextMuted,
    outline = LightBorder,
    outlineVariant = LightBorder,
    error = LightDanger,
    onError = Color.White,
    inverseSurface = LightText,
    inverseOnSurface = LightSurface,
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkAccent,
    onPrimary = Color(0xFF1A1814),
    primaryContainer = DarkSurface2,
    onPrimaryContainer = DarkText,
    secondary = DarkTextMuted,
    onSecondary = Color(0xFF1A1814),
    background = DarkBg,
    onBackground = DarkText,
    surface = DarkSurface,
    onSurface = DarkText,
    surfaceVariant = DarkSurface2,
    onSurfaceVariant = DarkTextMuted,
    outline = DarkBorder,
    outlineVariant = DarkBorder,
    error = DarkDanger,
    onError = Color(0xFFF2EFE7),
    inverseSurface = DarkText,
    inverseOnSurface = DarkSurface,
)

@Composable
fun QuestlineTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = QuestlineTypography,
        shapes = QuestlineShapes,
        content = content,
    )
}

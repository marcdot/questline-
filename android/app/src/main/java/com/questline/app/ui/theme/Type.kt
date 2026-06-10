package com.questline.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

// DESIGN.md §typography — Bricolage Grotesque (display), Hanken Grotesk (ui),
// JetBrains Mono (data). On Android these resolve to system-ui fallbacks unless
// the fonts are bundled in res/font/. We declare the CSS stacks as comments and
// use system-safe sans-serif/monospace families. Bundling the real fonts is a
// P7 polish task.

val DisplayFontFamily = FontFamily.SansSerif  // Bricolage Grotesque
val UiFontFamily = FontFamily.SansSerif        // Hanken Grotesk
val DataFontFamily = FontFamily.Monospace      // JetBrains Mono

val QuestlineTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = DisplayFontFamily,
        fontSize = 40.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 1.05.em,
        letterSpacing = (-0.02).em,
    ),
    displayMedium = TextStyle(
        fontFamily = DisplayFontFamily,
        fontSize = 32.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 1.10.em,
        letterSpacing = (-0.01).em,
    ),
    headlineLarge = TextStyle(
        fontFamily = UiFontFamily,
        fontSize = 22.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 1.25.em,
        letterSpacing = 0.em,
    ),
    headlineMedium = TextStyle(
        fontFamily = UiFontFamily,
        fontSize = 17.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 1.30.em,
        letterSpacing = 0.em,
    ),
    bodyLarge = TextStyle(
        fontFamily = UiFontFamily,
        fontSize = 15.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 1.55.em,
        letterSpacing = 0.em,
    ),
    bodyMedium = TextStyle(
        fontFamily = UiFontFamily,
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = 1.40.em,
        letterSpacing = 0.01.em,
    ),
    labelLarge = TextStyle(
        fontFamily = DataFontFamily,
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = 1.0.em,
        letterSpacing = 0.em,
    ),
    // Custom: data_lg (22sp, SemiBold, mono) — mapped to headlineSmall
    headlineSmall = TextStyle(
        fontFamily = DataFontFamily,
        fontSize = 22.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 1.0.em,
        letterSpacing = (-0.01).em,
    ),
    // Custom: label (11sp, SemiBold, uppercase, 0.08em tracking) — mapped to labelSmall
    labelSmall = TextStyle(
        fontFamily = UiFontFamily,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 1.0.em,
        letterSpacing = 0.08.em,
    ),
)

package com.questline.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.questline.app.R
import kotlinx.coroutines.delay
import androidx.compose.foundation.gestures.detectTapGestures

/**
 * Quest card with:
 *  - Tap = +1 (optimistic increment, light haptic, +1 float animation, fill animates)
 *  - Hold = complete (fill races toward full over ~500ms, release at full → burst)
 *
 * DESIGN-SYSTEM.md §6: Leading habit-colour bar, title, progress/target.
 * Motion spec §5: tap nudge, hold fill, completion burst + haptic.
 */
@Composable
fun QuestCard(
    habitColor: Color,
    title: String,
    progress: Int,
    targetCount: Int,
    completed: Boolean,
    onTap: () -> Unit,
    onHoldComplete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val haptic = LocalHapticFeedback.current

    // ── Animation state ──
    var isPressed by remember { mutableStateOf(false) }
    var isHolding by remember { mutableStateOf(false) }
    var showPlusOne by remember { mutableStateOf(false) }
    var showBurst by remember { mutableStateOf(false) }
    var holdFillProgress by remember { mutableFloatStateOf(0f) }

    val fillRatio = if (completed) 1f
    else if (isHolding) holdFillProgress
    else (progress.toFloat() / targetCount.toFloat()).coerceIn(0f, 1f)

    // Tap scale animation
    val cardScale by animateFloatAsState(
        targetValue = if (isPressed && !isHolding) 0.97f else 1f,
        animationSpec = tween(durationMillis = 120, easing = LinearEasing),
        label = "cardScale",
    )

    // +1 float alpha
    val plusOneAlpha by animateFloatAsState(
        targetValue = if (showPlusOne) 1f else 0f,
        animationSpec = tween(durationMillis = 300),
        label = "plusOneAlpha",
    )

    // Fill animation
    val effectiveFill by animateFloatAsState(
        targetValue = fillRatio,
        animationSpec = if (isHolding) {
            tween(durationMillis = 50, easing = LinearEasing)
        } else if (showBurst) {
            tween(durationMillis = 200, easing = LinearEasing)
        } else {
            tween(durationMillis = 300)
        },
        label = "effectiveFill",
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .scale(cardScale)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = {
                        if (!completed) {
                            isPressed = true
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            showPlusOne = true
                            onTap()
                        }
                    },
                    onLongPress = {
                        if (!completed) {
                            isHolding = true
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            onHoldComplete()
                        }
                    }
                )
            },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Box(
            modifier = Modifier.fillMaxWidth(),
        ) {
            // ── Leading habit-colour bar ──
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .width(4.dp)
                    .height(64.dp)
                    .clip(RoundedCornerShape(topEnd = 2.dp, bottomEnd = 2.dp))
                    .background(habitColor),
            )

            // ── Progress fill background (behind content) ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .clip(RoundedCornerShape(12.dp)),
            ) {
                // Animated fill area
                Box(
                    modifier = Modifier
                        .fillMaxWidth(effectiveFill)
                        .height(64.dp)
                        .background(habitColor.copy(alpha = 0.12f)),
                )
            }

            // ── Content row ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                // Title
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )

                Spacer(Modifier.width(12.dp))

                // Progress / target
                if (completed) {
                    Text(
                        text = stringResource(R.string.card_completed),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium,
                    )
                } else {
                    Text(
                        text = stringResource(R.string.card_progress_format, progress, targetCount),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // ── +1 Float animation ──
            if (showPlusOne) {
                Text(
                    text = "+1",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = habitColor,
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .offset(x = (-16).dp, y = (-8).dp)
                        .graphicsLayer {
                            alpha = plusOneAlpha
                            translationY = -20f * (1f - plusOneAlpha)
                        },
                )
            }

            // ── Completion burst overlay ──
            if (showBurst) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(12.dp))
                        .background(habitColor.copy(alpha = 0.15f)),
                )
            }
        }
    }
}

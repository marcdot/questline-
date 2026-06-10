package com.questline.app.ui.components

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.questline.app.R
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Quest card with:
 *  - Tap = +1 (optimistic increment, light haptic, +1 float animation, fill animates)
 *  - Hold = complete (fill races toward full over ~560ms with ember_fill easing,
 *    release at full → burst + crest haptic + onHoldComplete())
 *
 * DESIGN-SYSTEM.md §6: Leading habit-colour bar, title, progress/target.
 * Motion spec §5: tap nudge, hold fill, completion burst + haptic.
 *
 * FIX P3.1: Press-driven gesture via awaitEachGesture/awaitFirstDown + event-loop
 *   polling with ember_fill easing [CubicBezierEasing(0.22f, 0.61f, 0.36f, 1f)];
 *   uses AwaitPointerEventScope members only (no restricted-suspend violations).
 * FIX P3.2: State machine resets — isPressed cleared on gesture end,
 *   showPlusOne auto-hides after 900ms, showBurst auto-hides after 260ms.
 * FIX P3.3: Fill colour is lerp(emberColor, habitColor, holdFillProgress)
 *   applied as a radial gradient matching design.html §6.
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
    val viewConfig = LocalViewConfiguration.current
    val scope = rememberCoroutineScope()

    // ── Animation state ──
    var isPressed by remember { mutableStateOf(false) }
    var isHolding by remember { mutableStateOf(false) }
    var showPlusOne by remember { mutableStateOf(false) }
    var showBurst by remember { mutableStateOf(false) }
    var holdFillProgress by remember { mutableFloatStateOf(0f) }

    val emberColor = Color(0xFFD9542B)
    val HOLD_MS = 560L

    // Fill ratio: during a hold gesture (holdFillProgress > 0) show the
    // animated fill; otherwise show static progress or completed state.
    val fillRatio = if (completed) 1f
    else if (holdFillProgress > 0f) holdFillProgress
    else (progress.toFloat() / targetCount.toFloat()).coerceIn(0f, 1f)

    // ── Fill brush — ember→habit radial gradient (FIX 3) ──
    // Mirrors design.html §6: radial-gradient(120% 140% at 12% 50%, accent, habit)
    val fillBrush = remember(holdFillProgress) {
        val blended = lerp(emberColor, habitColor, holdFillProgress.coerceIn(0f, 1f))
        Brush.radialGradient(
            colors = listOf(
                blended.copy(alpha = 0.28f),
                blended.copy(alpha = 0.08f),
            ),
            center = Offset(40f, 32f),
            radius = 400f,
        )
    }

    // ── Animated fill width ──
    val effectiveFill by animateFloatAsState(
        targetValue = fillRatio,
        animationSpec = if (holdFillProgress > 0f) {
            tween(durationMillis = 50, easing = LinearEasing)
        } else if (showBurst) {
            tween(durationMillis = 200, easing = LinearEasing)
        } else {
            tween(durationMillis = 300)
        },
        label = "effectiveFill",
    )

    // ── Tap scale animation ──
    val cardScale by animateFloatAsState(
        targetValue = if (isPressed && !isHolding) 0.97f else 1f,
        animationSpec = tween(durationMillis = 120, easing = LinearEasing),
        label = "cardScale",
    )

    // ── +1 float alpha ──
    val plusOneAlpha by animateFloatAsState(
        targetValue = if (showPlusOne) 1f else 0f,
        animationSpec = tween(durationMillis = 300),
        label = "plusOneAlpha",
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .scale(cardScale)
            .pointerInput(Unit) {
                awaitEachGesture {
                    awaitFirstDown()
                    if (completed) {
                        waitForUpOrCancellation()
                        return@awaitEachGesture
                    }

                    isPressed = true
                    val downTime = System.nanoTime()
                    val emberEasing = CubicBezierEasing(
                        0.22f, 0.61f, 0.36f, 1f,
                    )
                    var holdCompleted = false

                    // Event loop: awaitPointerEvent fires at touch-sampling
                    // rate (~60–120 Hz), which is fast enough for smooth fill
                    // animation. Fill progress is time-driven so it remains
                    // smooth even with variable event cadence.
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Main)
                        val isUp = event.changes.any { change ->
                            // Released = pointer no longer pressed
                            !change.pressed
                        }

                        if (isUp) {
                            // ── Finger lifted ──
                            val elapsedMs =
                                (System.nanoTime() - downTime) / 1_000_000L

                            if (elapsedMs < viewConfig.longPressTimeoutMillis
                                && !holdCompleted
                            ) {
                                // Quick tap → +1, light haptic, float
                                holdFillProgress = 0f
                                haptic.performHapticFeedback(
                                    HapticFeedbackType.TextHandleMove,
                                )
                                showPlusOne = true
                                onTap()
                                scope.launch {
                                    delay(900L)
                                    showPlusOne = false
                                }
                            } else if (!holdCompleted) {
                                // Early release → recede over ~200ms
                                val fromProgress = holdFillProgress
                                scope.launch {
                                    val recedeStart = System.nanoTime()
                                    while (true) {
                                        val recedeMs = (System.nanoTime()
                                            - recedeStart) / 1_000_000L
                                        val k = (recedeMs.toFloat() / 200f)
                                            .coerceIn(0f, 1f)
                                        holdFillProgress =
                                            fromProgress * (1f - k)
                                        if (k >= 1f) break
                                        delay(16L)
                                    }
                                }
                            }
                            break
                        }

                        // ── Update fill progress (time-driven) ──
                        if (!holdCompleted) {
                            val elapsedMs =
                                (System.nanoTime() - downTime) / 1_000_000L
                            val rawT =
                                (elapsedMs.toFloat() / HOLD_MS).coerceIn(0f, 1f)
                            holdFillProgress = emberEasing.transform(rawT)

                            if (rawT >= 1f) {
                                // Full hold → crest haptic + burst + complete
                                holdCompleted = true
                                isHolding = true
                                showBurst = true
                                haptic.performHapticFeedback(
                                    HapticFeedbackType.LongPress,
                                )
                                onHoldComplete()
                                scope.launch {
                                    delay(260L)
                                    showBurst = false
                                }
                            }
                        }
                    }

                    // Reset press states (FIX 2 — state machine resets)
                    isPressed = false
                    isHolding = false
                }
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
                // Animated fill area with ember→habit radial gradient
                Box(
                    modifier = Modifier
                        .fillMaxWidth(effectiveFill)
                        .height(64.dp)
                        .background(fillBrush),
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

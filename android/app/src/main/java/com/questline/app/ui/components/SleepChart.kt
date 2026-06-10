package com.questline.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

/** Compact month sleep chart drawn with Canvas. */
@Composable
fun SleepChart(
    hours: List<Float>,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Sleep (this month)",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 4.dp)
        )
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
        ) {
            if (hours.isEmpty()) return@Canvas

            val pad = 4f
            val w = size.width - pad * 2
            val h = size.height
            val step = w / (hours.size - 1).coerceAtLeast(1)
            val maxH = hours.maxOrNull()?.coerceAtLeast(1f) ?: 1f

            val lineColor = Color(0xFF5AA469)
            val path = Path()
            hours.forEachIndexed { i, v ->
                val x = pad + i * step
                val y = h - (v / maxH) * (h - 8f)
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            drawPath(path, color = lineColor, style = Stroke(width = 2f, cap = StrokeCap.Round))

            // Dots for each data point
            hours.forEachIndexed { i, v ->
                val x = pad + i * step
                val y = h - (v / maxH) * (h - 8f)
                drawCircle(lineColor, radius = 2.5f, center = Offset(x, y))
            }
        }
    }
}
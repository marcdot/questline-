package com.questline.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

// DESIGN.md §radius
val QuestlineShapes = Shapes(
    small = RoundedCornerShape(8.dp),    // sm
    medium = RoundedCornerShape(12.dp),  // md
    large = RoundedCornerShape(16.dp),   // lg
    extraLarge = RoundedCornerShape(24.dp), // xl (bottom sheets)
)

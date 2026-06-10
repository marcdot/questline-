package com.questline.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Sealed hierarchy representing each top-level destination in the bottom nav.
 * Matches DESIGN-SYSTEM.md §4.4: Home · Habits · ➕ · Stats · Profile.
 * (➕ is a FAB handled by the bottom bar composable; it is not a nav destination.)
 */
sealed class Screen(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
) {
    data object Home : Screen(
        route = "home",
        label = "Home",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home,
    )

    data object Habits : Screen(
        route = "habits",
        label = "Habits",
        selectedIcon = Icons.Filled.Home,   // placeholder icon
        unselectedIcon = Icons.Outlined.Home,
    )

    data object Stats : Screen(
        route = "stats",
        label = "Stats",
        selectedIcon = Icons.Filled.BarChart,
        unselectedIcon = Icons.Outlined.BarChart,
    )

    data object Profile : Screen(
        route = "profile",
        label = "Profile",
        selectedIcon = Icons.Filled.Person,
        unselectedIcon = Icons.Outlined.Person,
    )

    companion object {
        val bottomNavItems = listOf(Home, Habits, Stats, Profile)
    }
}

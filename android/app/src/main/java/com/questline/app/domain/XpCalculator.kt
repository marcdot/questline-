package com.questline.app.domain

/**
 * XP calculation per docs/05 §5.
 *
 * BASE_COMPLETE        = 10
 * PER_PROGRESS         = 0  (MVP: progress alone gives 0; only completion pays)
 * STREAK_BONUS(streak) = min(streak, 7) * 2  (+2 per consecutive period, capped at +14)
 * CADENCE_MULT         = { daily:1.0, weekly:2.0, monthly:4.0, yearly:8.0 }
 *
 * Formula: xp = round((BASE_COMPLETE + STREAK_BONUS(s)) * CADENCE_MULT[Q.cadence])
 *
 * §8 test vector: Mon→Wed → current=2 → XP = round((10 + 4) * 1.0) = 14
 * Gap vector:     streak=1 → XP = round((10 + 2) * 1.0) = 12
 */
object XpCalculator {

    const val BASE_COMPLETE = 10
    const val PER_PROGRESS = 0

    /**
     * Streak bonus: +2 per consecutive period, capped at +14 (streak of 7).
     */
    fun streakBonus(streak: Int): Int {
        return minOf(streak, 7) * 2
    }

    /**
     * Cadence multiplier from docs/05 §5.
     */
    fun cadenceMultiplier(cadence: String): Double = when (cadence) {
        "daily" -> 1.0
        "weekly" -> 2.0
        "monthly" -> 4.0
        "yearly" -> 8.0
        else -> 1.0
    }

    /**
     * Calculate XP awarded on completing an instance.
     * @param streak current streak AFTER this completion
     * @param cadence the quest's cadence
     * @return xp amount (rounded to int)
     */
    fun calculateXp(streak: Int, cadence: String): Int {
        val base = BASE_COMPLETE + streakBonus(streak)
        val mult = cadenceMultiplier(cadence)
        return (base * mult).toInt() // base*mult is integer for our cadence multiplier values
    }

    /**
     * Level formula (display only):
     * level = floor(sqrt(balance / 50)) + 1
     */
    fun levelForXp(balance: Int): Int {
        return kotlin.math.sqrt((balance / 50).toDouble()).toInt() + 1
    }
}

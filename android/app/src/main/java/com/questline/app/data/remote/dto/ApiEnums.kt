package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Enums mirroring docs/02 exactly.
 * SerialName values match the Postgres enum labels used in the Supabase schema.
 */
@Serializable
enum class Cadence {
    @SerialName("daily") DAILY,
    @SerialName("weekly") WEEKLY,
    @SerialName("monthly") MONTHLY,
    @SerialName("yearly") YEARLY
}

@Serializable
enum class Weekday {
    @SerialName("mon") MON,
    @SerialName("tue") TUE,
    @SerialName("wed") WED,
    @SerialName("thu") THU,
    @SerialName("fri") FRI,
    @SerialName("sat") SAT,
    @SerialName("sun") SUN
}

@Serializable
enum class EventKind {
    @SerialName("increment") INCREMENT,
    @SerialName("complete") COMPLETE,
    @SerialName("uncomplete") UNCOMPLETE
}

@Serializable
enum class ThemePref {
    @SerialName("system") SYSTEM,
    @SerialName("light") LIGHT,
    @SerialName("dark") DARK
}

@Serializable
enum class XpDisplay {
    @SerialName("simple") SIMPLE,
    @SerialName("detailed") DETAILED
}

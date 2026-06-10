package com.questline.app.domain

/**
 * Weekday enum used in domain layer (doc/02 §Enums, ISO order mon→sun).
 */
enum class Weekday(val key: String) {
    MON("mon"),
    TUE("tue"),
    WED("wed"),
    THU("thu"),
    FRI("fri"),
    SAT("sat"),
    SUN("sun");

    companion object {
        fun fromKey(key: String): Weekday =
            entries.first { it.key == key }
    }
}

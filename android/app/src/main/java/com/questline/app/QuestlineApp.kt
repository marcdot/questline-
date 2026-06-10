package com.questline.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class annotated with @HiltAndroidApp for Hilt DI.
 */
@HiltAndroidApp
class QuestlineApp : Application()

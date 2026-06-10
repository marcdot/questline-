package com.questline.app.data.remote

import com.questline.app.data.local.AppDatabase
import com.questline.app.data.local.dao.CacheDao
import com.questline.app.data.local.dao.OfflineQueueDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing data-layer singletons.
 */
@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    @Provides
    @Singleton
    fun provideSupabaseRemoteSource(): SupabaseRemoteSource {
        return SupabaseRemoteSource()
    }

    @Provides
    @Singleton
    fun provideCacheDao(db: AppDatabase): CacheDao = db.cacheDao()

    @Provides
    @Singleton
    fun provideOfflineQueueDao(db: AppDatabase): OfflineQueueDao = db.offlineQueueDao()
}

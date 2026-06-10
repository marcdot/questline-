package com.questline.app.di

import com.questline.app.data.local.AuthStorage
import com.questline.app.data.remote.SupabaseRemoteSource
import com.questline.app.data.repo.AuthRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing auth-related singletons.
 */
@Module
@InstallIn(SingletonComponent::class)
object AuthModule {

    @Provides
    @Singleton
    fun provideAuthRepository(
        authStorage: AuthStorage,
        remoteSource: SupabaseRemoteSource,
    ): AuthRepository {
        val repo = AuthRepository(authStorage)
        // When the auth token changes, propagate it to the data source
        // so all subsequent REST calls use Bearer auth (RLS).
        repo.onAuthTokenChanged = { token ->
            remoteSource.accessToken = token
        }
        // If a session already exists, set the token immediately
        if (authStorage.hasSession) {
            remoteSource.accessToken = authStorage.accessToken
        }
        return repo
    }
}

package com.questline.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Response from Supabase Auth sign-up and sign-in endpoints.
 *
 * POST /auth/v1/signup
 * POST /auth/v1/token?grant_type=password
 * POST /auth/v1/token?grant_type=refresh_token
 * POST /auth/v1/token?grant_type=id_token
 */
@Serializable
data class AuthSessionResponse(
    @SerialName("access_token")
    val accessToken: String,
    @SerialName("refresh_token")
    val refreshToken: String,
    @SerialName("expires_in")
    val expiresIn: Long? = null,
    @SerialName("token_type")
    val tokenType: String? = null,
    val user: AuthUserResponse? = null
)

/**
 * User info returned by Supabase Auth.
 */
@Serializable
data class AuthUserResponse(
    val id: String,
    val email: String? = null,
    @SerialName("user_metadata")
    val userMetadata: Map<String, String>? = null
)

/**
 * Supabase Auth error response (standard GoTrue error format).
 */
@Serializable
data class AuthErrorResponse(
    val error: String? = null,
    @SerialName("error_description")
    val errorDescription: String? = null,
    val message: String? = null
)

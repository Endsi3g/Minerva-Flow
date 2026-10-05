package com.minervaflow.loyalty.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

val AppJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    explicitNulls = false
}

@Serializable
data class AuthUser(val id: String, val email: String? = null)

@Serializable
data class AuthResponse(
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("expires_in") val expiresIn: Long = 3600,
    val user: AuthUser? = null,
)

data class Session(
    val accessToken: String,
    val refreshToken: String,
    val expiresAtMs: Long,
    val userId: String,
    val email: String?,
) {
    fun isExpiringSoon(nowMs: Long = System.currentTimeMillis(), marginMs: Long = 60_000): Boolean =
        nowMs + marginMs >= expiresAtMs
}

@Serializable
data class Customer(
    val id: String,
    @SerialName("restaurant_id") val restaurantId: String,
    val name: String = "",
    val email: String? = null,
    val phone: String? = null,
    @SerialName("visit_count") val visitCount: Int = 0,
    @SerialName("total_spent") val totalSpent: Double = 0.0,
    @SerialName("loyalty_points") val loyaltyPoints: Int = 0,
)

@Serializable
data class LoyaltyReward(
    val id: String,
    @SerialName("restaurant_id") val restaurantId: String,
    val name: String,
    @SerialName("points_cost") val pointsCost: Int,
    val description: String? = null,
)

@Serializable
data class Offer(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("ends_at") val endsAt: String? = null,
    val price: Double? = null,
)

@Serializable
data class LoyaltyTransaction(
    val id: String,
    val type: String = "",
    @SerialName("points_delta") val pointsDelta: Int = 0,
    val note: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("amount_spent") val amountSpent: Double? = null,
)

/** Customer-safe restaurant fields, served by the bridge because `restaurants` is not readable by a guest. */
@Serializable
data class RestaurantBridge(
    val name: String = "",
    val city: String? = null,
    val loyaltyTier2Threshold: Double = 150.0,
    val loyaltyTier3Threshold: Double = 400.0,
    val phone: String? = null,
)

@Serializable
data class Membership(
    val customerId: String,
    val restaurantId: String,
    val restaurantName: String,
    val visitCount: Int = 0,
    val totalSpent: Double = 0.0,
    val loyaltyPoints: Int = 0,
)

@Serializable
data class MembershipsResponse(val memberships: List<Membership> = emptyList())

@Serializable
data class BonusAward(
    @SerialName("restaurant_id") val restaurantId: String? = null,
    @SerialName("restaurant_name") val restaurantName: String? = null,
    val points: Int = 0,
)

@Serializable
data class RedemptionCode(val code: String = "")

@Serializable
data class WalletLink(val url: String)

data class HomeData(
    val customer: Customer,
    val restaurantName: String?,
    val tier2Threshold: Double,
    val tier3Threshold: Double,
    val rewards: List<LoyaltyReward>,
    val offers: List<Offer>,
    val transactions: List<LoyaltyTransaction>,
    val memberships: List<Membership>,
)

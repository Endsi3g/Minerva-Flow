package com.minervaflow.loyalty.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OwnerRestaurant(val id: String, val name: String = "", val city: String? = null)

@Serializable
data class MemberRow(
    val role: String,
    @SerialName("restaurant_id") val restaurantId: String,
    val restaurants: OwnerRestaurant? = null,
)

@Serializable
data class OwnerOrder(
    val id: String,
    @SerialName("restaurant_id") val restaurantId: String,
    val status: String,
    @SerialName("guest_name") val guestName: String? = null,
    val total: Double = 0.0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("requested_ready_at") val requestedReadyAt: String? = null,
    @SerialName("order_kind") val orderKind: String? = null,
)

@Serializable
data class OwnerMenuItem(
    val id: String,
    val name: String,
    val category: String? = null,
    val price: Double = 0.0,
    val active: Boolean = false,
    @SerialName("is_draft") val isDraft: Boolean = false,
)

@Serializable
data class OwnerCustomer(
    val id: String,
    val name: String = "",
    val email: String? = null,
    val phone: String? = null,
    @SerialName("loyalty_points") val loyaltyPoints: Int = 0,
    @SerialName("visit_count") val visitCount: Int = 0,
    @SerialName("total_spent") val totalSpent: Double = 0.0,
)

/** A phone-number match at the counter; the balance stays hidden until the guest's code is confirmed. */
@Serializable
data class LookupHit(
    @SerialName("customer_id") val id: String,
    @SerialName("customer_name") val name: String = "",
    @SerialName("customer_phone") val phone: String? = null,
)

@Serializable
data class CounterCustomer(
    @SerialName("customer_id") val id: String,
    @SerialName("customer_name") val name: String = "",
    @SerialName("customer_phone") val phone: String? = null,
    @SerialName("loyalty_points") val loyaltyPoints: Int = 0,
    @SerialName("visit_count") val visitCount: Int = 0,
    @SerialName("total_spent") val totalSpent: Double = 0.0,
)

@Serializable
data class ServiceDayRevenue(val revenue: Double = 0.0)

@Serializable
data class IdOnly(val id: String)

@Serializable
data class StaffNoteRow(val body: String = "")

data class OwnerOverview(val monthRevenue: Double, val monthOrders: Int)

/** Order statuses in the order a kitchen moves through them. */
object OrderStatus {
    const val NEW = "soumise"
    const val PREPARING = "en_preparation"
    const val READY = "prete"
    const val SERVED = "servie"
    const val CANCELLED = "annulee"
    val workflow = listOf(NEW, PREPARING, READY, SERVED)
    val toHandle = setOf(NEW, PREPARING)
}

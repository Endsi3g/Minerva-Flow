package com.minervaflow.loyalty.data

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.net.URLEncoder
import java.time.LocalDate
import java.time.ZoneId

sealed interface CounterResult<out T> {
    data class Ok<T>(val value: T) : CounterResult<T>
    data object Rejected : CounterResult<Nothing>
    data object Failure : CounterResult<Nothing>
}

/**
 * Everything the owner or manager sees. Reads go straight through the person's own session, so the
 * restaurant-member policies in the database decide what comes back; nothing here holds a server key.
 */
class OwnerRepository(private val api: ApiClient) {

    /** Restaurants where the signed-in person is an active owner or manager. Empty for a guest. */
    suspend fun restaurants(): List<OwnerRestaurant> {
        val rows = api.select(
            "restaurant_members",
            "select=role,restaurant_id,restaurants(id,name,city)&status=eq.active",
            ListSerializer(MemberRow.serializer()),
        )
        return rows.filter { it.role == "owner" || it.role == "manager" }
            .mapNotNull { it.restaurants }
            .distinctBy { it.id }
    }

    suspend fun overview(restaurantId: String): OwnerOverview = coroutineScope {
        val zone = ZoneId.systemDefault()
        val monthStart = LocalDate.now().withDayOfMonth(1)
        val revenue = async {
            api.select(
                "service_days",
                "select=revenue&restaurant_id=eq.$restaurantId&date=gte.$monthStart",
                ListSerializer(ServiceDayRevenue.serializer()),
            ).sumOf { it.revenue }
        }
        val orders = async {
            api.select(
                "orders",
                "select=id&restaurant_id=eq.$restaurantId&created_at=gte.${monthStart.atStartOfDay(zone).toInstant()}&limit=1000",
                ListSerializer(IdOnly.serializer()),
            ).size
        }
        OwnerOverview(revenue.await(), orders.await())
    }

    suspend fun orders(restaurantId: String): List<OwnerOrder> = api.select(
        "orders",
        "select=id,restaurant_id,status,guest_name,total,created_at,requested_ready_at,order_kind" +
            "&restaurant_id=eq.$restaurantId&order=created_at.desc&limit=50",
        ListSerializer(OwnerOrder.serializer()),
    )

    suspend fun menu(restaurantId: String): List<OwnerMenuItem> = api.select(
        "menu_items",
        "select=id,name,category,price,active,is_draft&restaurant_id=eq.$restaurantId&order=name.asc",
        ListSerializer(OwnerMenuItem.serializer()),
    )

    /** Newest customers first, or those whose name or phone contains [search]. */
    suspend fun customers(restaurantId: String, search: String = ""): List<OwnerCustomer> {
        val cleaned = search.filter { it !in ",()*%" }.trim()
        val filter = if (cleaned.isEmpty()) "" else "&or=(name.ilike.*${enc(cleaned)}*,phone.ilike.*${enc(cleaned)}*)"
        return api.select(
            "customers",
            "select=id,name,email,phone,loyalty_points,visit_count,total_spent&restaurant_id=eq.$restaurantId$filter&order=created_at.desc&limit=100",
            ListSerializer(OwnerCustomer.serializer()),
        )
    }

    // ---- Orders -----------------------------------------------------------------------------------------

    /** The server updates the status and notifies the customer. */
    suspend fun setOrderStatus(orderId: String, restaurantId: String, status: String): Boolean = runCatching {
        val body = buildJsonObject {
            put("restaurantId", restaurantId)
            put("status", status)
            if (status == OrderStatus.CANCELLED) put("cancellationReason", "Un imprévu empêche le restaurant de préparer cette commande.")
        }.toString()
        api.authorized("${Config.API_BASE}/api/native/owner/orders/$orderId/status", method = "POST", body = body).ok
    }.getOrDefault(false)

    // ---- Menu -------------------------------------------------------------------------------------------

    /** Hides or shows a dish. A draft stays hidden until its price and allergens are confirmed on the web. */
    suspend fun setMenuItemActive(restaurantId: String, item: OwnerMenuItem, active: Boolean): Boolean {
        if (active && item.isDraft) return false
        return runCatching {
            api.authorized(
                "${Config.SUPABASE_URL}/rest/v1/menu_items?restaurant_id=eq.$restaurantId&id=eq.${item.id}",
                method = "PATCH",
                body = buildJsonObject { put("active", active) }.toString(),
                prefer = "return=minimal",
            ).ok
        }.getOrDefault(false)
    }

    // ---- Team notes (never visible to the guest) --------------------------------------------------------

    suspend fun staffNote(customerId: String): String = runCatching {
        api.select("customer_staff_notes", "select=body&customer_id=eq.$customerId", ListSerializer(StaffNoteRow.serializer()))
            .firstOrNull()?.body.orEmpty()
    }.getOrDefault("")

    suspend fun saveStaffNote(restaurantId: String, customerId: String, userId: String?, raw: String): Boolean {
        val body = raw.replace("\r\n", "\n").trim().take(2000)
        return runCatching {
            if (body.isEmpty()) {
                api.authorized("${Config.SUPABASE_URL}/rest/v1/customer_staff_notes?customer_id=eq.$customerId", method = "DELETE").ok
            } else {
                api.authorized(
                    "${Config.SUPABASE_URL}/rest/v1/customer_staff_notes?on_conflict=customer_id",
                    method = "POST",
                    body = buildJsonObject {
                        put("customer_id", customerId)
                        put("restaurant_id", restaurantId)
                        put("body", body)
                        if (userId != null) put("updated_by", userId)
                    }.toString(),
                    prefer = "resolution=merge-duplicates,return=minimal",
                ).ok
            }
        }.getOrDefault(false)
    }

    // ---- Counter ----------------------------------------------------------------------------------------

    suspend fun lookupByPhone(restaurantId: String, phone: String): List<LookupHit> = runCatching {
        if (phone.count { it.isDigit() } < 7) return emptyList()
        val res = api.authorized(
            "${Config.SUPABASE_URL}/rest/v1/rpc/lookup_customer_by_phone",
            method = "POST",
            body = buildJsonObject { put("p_restaurant_id", restaurantId); put("p_phone", phone) }.toString(),
        )
        if (!res.ok) emptyList() else api.json.decodeFromString(ListSerializer(LookupHit.serializer()), res.body)
    }.getOrDefault(emptyList())

    /** Shows the balance only after the guest's current 6-digit code is accepted for this exact customer. */
    suspend fun confirmIdentity(restaurantId: String, customerId: String, code: String): CounterResult<CounterCustomer> {
        if (code.length != 6 || !code.all { it.isDigit() }) return CounterResult.Rejected
        return runCatching {
            val res = api.authorized(
                "${Config.SUPABASE_URL}/rest/v1/rpc/resolve_pairing_code_for_customer",
                method = "POST",
                body = buildJsonObject {
                    put("p_restaurant_id", restaurantId); put("p_customer_id", customerId); put("p_code", code)
                }.toString(),
            )
            if (!res.ok) return CounterResult.Rejected
            val rows = api.json.decodeFromString(ListSerializer(CounterCustomer.serializer()), res.body)
            val match = rows.firstOrNull { it.id == customerId }
            if (match == null) CounterResult.Rejected else CounterResult.Ok(match)
        }.getOrDefault(CounterResult.Failure)
    }

    /** The database recomputes points from the restaurant's settings; the points value sent is ignored. */
    suspend fun recordVisit(restaurantId: String, customerId: String, amount: Double): Boolean {
        if (!amount.isFinite() || amount <= 0 || amount > 100_000) return false
        return runCatching {
            api.authorized(
                "${Config.SUPABASE_URL}/rest/v1/rpc/increment_customer_visit",
                method = "POST",
                body = buildJsonObject {
                    put("p_customer_id", customerId)
                    put("p_restaurant_id", restaurantId)
                    put("p_amount_spent", amount)
                    put("p_points_delta", 0)
                    put("p_note", "Visite comptoir — identité confirmée")
                    put("p_via_pairing_code", true)
                    put("p_via_pos_sync", false)
                    put("p_via_phone_lookup", true)
                }.toString(),
            ).ok
        }.getOrDefault(false)
    }

    /** Owner and manager accounts delete through their own route, which protects a sole owner. */
    suspend fun deleteAccount(): DeleteOutcome = runCatching {
        val res = api.authorized("${Config.API_BASE}/api/owner/account", method = "DELETE")
        when {
            res.ok -> DeleteOutcome.Deleted
            res.status == 409 -> DeleteOutcome.SoleOwner
            else -> DeleteOutcome.Failed
        }
    }.getOrDefault(DeleteOutcome.Failed)

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")
}

enum class DeleteOutcome { Deleted, SoleOwner, Failed }

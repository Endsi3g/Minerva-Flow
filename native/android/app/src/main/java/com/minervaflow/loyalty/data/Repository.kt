package com.minervaflow.loyalty.data

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

sealed interface WalletResult {
    data class Url(val url: String) : WalletResult
    data object NotAvailable : WalletResult
    data object SignedOut : WalletResult
    data object Failure : WalletResult
}

sealed interface RedeemResult {
    data class Code(val code: String) : RedeemResult
    data object Failure : RedeemResult
}

class Repository(private val api: ApiClient, private val store: SessionStore) {
    val session: Session? get() = store.load()

    suspend fun signInWithPassword(email: String, password: String) = api.signInWithPassword(email, password)
    suspend fun signUpWithPassword(email: String, password: String, optIn: Boolean) = api.signUpWithPassword(email, password, optIn)
    suspend fun sendCode(email: String, optIn: Boolean) = api.sendCode(email, optIn)
    suspend fun verifyCode(email: String, code: String) = api.verifyCode(email, code)
    suspend fun signOut() = api.signOut()

    /** The first card (oldest membership) is the home card, like the iOS app. Null when the account has none. */
    suspend fun loadHome(): HomeData? {
        val customers = api.select("customers", "select=*&order=created_at.asc", ListSerializer(Customer.serializer()))
        val mine = customers.firstOrNull() ?: return null
        return coroutineScope {
            val bridge = async { runCatching { api.bridge("/api/portal/restaurant", RestaurantBridge.serializer()) }.getOrNull() }
            val memberships = async {
                runCatching { api.bridge("/api/portal/restaurants", MembershipsResponse.serializer()).memberships }.getOrDefault(emptyList())
            }
            val transactions = async {
                api.select(
                    "loyalty_transactions",
                    "select=*&customer_id=eq.${mine.id}&order=created_at.desc&limit=20",
                    ListSerializer(LoyaltyTransaction.serializer()),
                )
            }
            val rewards = async {
                api.select(
                    "loyalty_rewards",
                    "select=*&restaurant_id=eq.${mine.restaurantId}&active=eq.true&order=points_cost.asc",
                    ListSerializer(LoyaltyReward.serializer()),
                )
            }
            val offers = async {
                api.select(
                    "offers",
                    "select=*&restaurant_id=eq.${mine.restaurantId}&active=eq.true",
                    ListSerializer(Offer.serializer()),
                )
            }
            val restaurant = bridge.await()
            HomeData(
                customer = mine,
                restaurantName = restaurant?.name?.takeIf { it.isNotBlank() },
                tier2Threshold = restaurant?.loyaltyTier2Threshold ?: 150.0,
                tier3Threshold = restaurant?.loyaltyTier3Threshold ?: 400.0,
                rewards = rewards.await(),
                offers = offers.await(),
                transactions = transactions.await(),
                memberships = memberships.await(),
            )
        }
    }

    /** One-time bonus for installing the app. Never blocks the screen: any failure just means no bonus shown. */
    suspend fun claimAppInstallBonus(): List<BonusAward> = runCatching {
        val res = api.authorized("${Config.SUPABASE_URL}/rest/v1/rpc/claim_app_install_bonus", method = "POST", body = "{}")
        if (!res.ok) emptyList() else api.json.decodeFromString(ListSerializer(BonusAward.serializer()), res.body)
    }.getOrDefault(emptyList())

    /** Spends points on a reward and returns the code to show at the counter. */
    suspend fun redeem(rewardId: String): RedeemResult = runCatching {
        val res = api.authorized(
            "${Config.SUPABASE_URL}/rest/v1/rpc/self_redeem_reward",
            method = "POST",
            body = buildJsonObject { put("p_reward_id", rewardId) }.toString(),
        )
        if (!res.ok) return RedeemResult.Failure
        val code = extractRedemptionCode(api.json.parseToJsonElement(res.body))
        if (code.isBlank()) RedeemResult.Failure else RedeemResult.Code(code)
    }.getOrDefault(RedeemResult.Failure)

    /** Rotating 6-digit code (valid 5 minutes) the guest gives the counter to confirm who they are. */
    suspend fun mintPairingCode(): PairingCode? = runCatching {
        val res = api.authorized("${Config.SUPABASE_URL}/rest/v1/rpc/mint_pairing_code", method = "POST", body = "{}")
        if (!res.ok) null
        else api.json.decodeFromString(ListSerializer(PairingCode.serializer()), res.body).firstOrNull()
    }.getOrNull()

    /** The guest's own phone number: what the counter uses to find the card. */
    suspend fun updatePhone(customerId: String, e164: String): Boolean = runCatching {
        val res = api.authorized(
            "${Config.SUPABASE_URL}/rest/v1/customers?id=eq.$customerId",
            method = "PATCH",
            body = buildJsonObject { put("phone", e164) }.toString(),
            prefer = "return=minimal",
        )
        res.ok
    }.getOrDefault(false)

    suspend fun googleWalletLink(customerId: String): WalletResult = try {
        val res = api.authorized("${Config.API_BASE}/api/wallet/google?customerId=$customerId")
        when {
            res.ok -> WalletResult.Url(api.json.decodeFromString(WalletLink.serializer(), res.body).url)
            res.status == 503 -> WalletResult.NotAvailable
            res.status == 401 -> WalletResult.SignedOut
            else -> WalletResult.Failure
        }
    } catch (e: ApiException) {
        if (e.kind == ApiErrorKind.SignedOut) WalletResult.SignedOut else WalletResult.Failure
    } catch (_: Exception) {
        WalletResult.Failure
    }

    /** Irreversible. The server removes the account and signs the person out of every device. */
    suspend fun deleteAccount(): Boolean = runCatching {
        val res = api.authorized("${Config.API_BASE}/api/portal/account", method = "DELETE")
        if (res.ok) store.clear()
        res.ok
    }.getOrDefault(false)
}

/** PostgREST returns a composite row as an object, or a one-element array depending on the version. */
fun extractRedemptionCode(element: JsonElement): String = when (element) {
    is JsonObject -> (element["code"] as? kotlinx.serialization.json.JsonPrimitive)?.content.orEmpty()
    is JsonArray -> element.firstOrNull()?.let { extractRedemptionCode(it) }.orEmpty()
    else -> ""
}

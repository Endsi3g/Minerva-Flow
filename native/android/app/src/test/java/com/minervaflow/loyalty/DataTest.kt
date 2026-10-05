package com.minervaflow.loyalty

import com.minervaflow.loyalty.data.ApiErrorKind
import com.minervaflow.loyalty.data.ApiErrors
import com.minervaflow.loyalty.data.AppJson
import com.minervaflow.loyalty.data.AuthResponse
import com.minervaflow.loyalty.data.BonusAward
import com.minervaflow.loyalty.data.Customer
import com.minervaflow.loyalty.data.LoyaltyReward
import com.minervaflow.loyalty.data.MembershipsResponse
import com.minervaflow.loyalty.data.MemorySessionStore
import com.minervaflow.loyalty.data.Offer
import com.minervaflow.loyalty.data.RestaurantBridge
import com.minervaflow.loyalty.data.Session
import com.minervaflow.loyalty.data.WalletLink
import com.minervaflow.loyalty.data.extractRedemptionCode
import com.minervaflow.loyalty.ui.screens.qrPayload
import kotlinx.serialization.builtins.ListSerializer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DataTest {
    @Test fun customerRowDecodesFromPostgrest() {
        val json = """[{"id":"c1","restaurant_id":"r1","name":"Maxime Ouellet","email":null,"phone":"+15145550100",
            "visit_count":5,"total_spent":279.81,"loyalty_points":405,"user_id":"u1","marketing_consent":true,"extra":1}]"""
        val customers = AppJson.decodeFromString(ListSerializer(Customer.serializer()), json)
        assertEquals(1, customers.size)
        assertEquals(405, customers[0].loyaltyPoints)
        assertEquals(279.81, customers[0].totalSpent, 0.0001)
        assertNull(customers[0].email)
    }

    @Test fun rewardsAndOffersDecode() {
        val rewards = AppJson.decodeFromString(
            ListSerializer(LoyaltyReward.serializer()),
            """[{"id":"a","restaurant_id":"r","name":"Café ou thé offert","points_cost":50,"active":true,"description":null}]"""
        )
        assertEquals(50, rewards[0].pointsCost)
        val offers = AppJson.decodeFromString(
            ListSerializer(Offer.serializer()),
            """[{"id":"o","title":"5 à 7","description":"Jeudis","ends_at":"2026-10-30T04:00:00+00:00","price":9,"image_url":null}]"""
        )
        assertEquals("5 à 7", offers[0].title)
        assertEquals(9.0, offers[0].price!!, 0.0)
    }

    @Test fun bridgeResponsesDecodeWithMissingFields() {
        val restaurant = AppJson.decodeFromString(
            RestaurantBridge.serializer(),
            """{"name":"Minerva Flow — Démo","city":"Montréal","timezone":"America/Toronto","loyaltyTier2Threshold":150,"loyaltyTier3Threshold":400,"isBusy":false}"""
        )
        assertEquals("Minerva Flow — Démo", restaurant.name)
        assertEquals(400.0, restaurant.loyaltyTier3Threshold, 0.0)
        val memberships = AppJson.decodeFromString(
            MembershipsResponse.serializer(),
            """{"memberships":[{"customerId":"c","restaurantId":"r","restaurantName":"Établissement","visitCount":2,"totalSpent":10.5,"loyaltyPoints":30}]}"""
        )
        assertEquals(30, memberships.memberships[0].loyaltyPoints)
    }

    @Test fun bonusAndWalletDecode() {
        val bonus = AppJson.decodeFromString(
            ListSerializer(BonusAward.serializer()),
            """[{"restaurant_id":"r","restaurant_name":"Café","points":25}]"""
        )
        assertEquals(25, bonus[0].points)
        assertEquals("https://pay.google.com/gp/v/save/abc", AppJson.decodeFromString(WalletLink.serializer(), """{"url":"https://pay.google.com/gp/v/save/abc"}""").url)
    }

    @Test fun authResponseWithoutTokensMeansConfirmEmailFirst() {
        val signUp = AppJson.decodeFromString(AuthResponse.serializer(), """{"id":"u","email":"a@b.co","confirmation_sent_at":"2026-10-04T00:00:00Z"}""")
        assertNull(signUp.accessToken)
        val signedIn = AppJson.decodeFromString(
            AuthResponse.serializer(),
            """{"access_token":"t","refresh_token":"r","expires_in":3600,"token_type":"bearer","user":{"id":"u","email":"a@b.co"}}"""
        )
        assertEquals("u", signedIn.user?.id)
    }

    @Test fun redemptionCodeIsReadFromAnObjectOrAnArray() {
        assertEquals("AB12CD", extractRedemptionCode(AppJson.parseToJsonElement("""{"id":"x","code":"AB12CD"}""")))
        assertEquals("AB12CD", extractRedemptionCode(AppJson.parseToJsonElement("""[{"id":"x","code":"AB12CD"}]""")))
        assertEquals("", extractRedemptionCode(AppJson.parseToJsonElement("""[]""")))
        assertEquals("", extractRedemptionCode(AppJson.parseToJsonElement("""null""")))
    }

    @Test fun errorsAreClassifiedForTheUi() {
        assertEquals(ApiErrorKind.InvalidCredentials, ApiErrors.classify(400, """{"error_description":"Invalid login credentials"}"""))
        assertEquals(ApiErrorKind.EmailNotConfirmed, ApiErrors.classify(400, """{"msg":"Email not confirmed"}"""))
        assertEquals(ApiErrorKind.RateLimited, ApiErrors.classify(429, ""))
        assertEquals(ApiErrorKind.RateLimited, ApiErrors.classify(400, """{"code":"over_email_send_rate_limit"}"""))
        assertEquals(ApiErrorKind.CodeInvalid, ApiErrors.classify(403, """{"error_code":"otp_expired"}"""))
        assertEquals(ApiErrorKind.NotAvailable, ApiErrors.classify(503, """{"code":"WALLET_NOT_CONFIGURED"}"""))
        assertEquals(ApiErrorKind.SignedOut, ApiErrors.classify(401, ""))
        assertEquals(ApiErrorKind.Unknown, ApiErrors.classify(500, "boom"))
    }

    @Test fun sessionExpiresWithASafetyMargin() {
        val s = Session("a", "r", expiresAtMs = 1_000_000, userId = "u", email = null)
        assertFalse(s.isExpiringSoon(nowMs = 900_000, marginMs = 60_000))
        assertTrue(s.isExpiringSoon(nowMs = 950_000, marginMs = 60_000))
        assertTrue(s.isExpiringSoon(nowMs = 2_000_000))
    }

    @Test fun memorySessionStoreRoundTrips() {
        val store = MemorySessionStore()
        assertNull(store.load())
        store.save(Session("a", "r", 1L, "u", "e@x.co"))
        assertNotNull(store.load())
        store.clear()
        assertNull(store.load())
    }

    @Test fun qrCarriesThePhoneTheCounterTypesOtherwiseTheCardLink() {
        assertEquals("5145550100", qrPayload("+15145550100", "c1"))
        assertEquals("https://minervaflow.app/c/c1", qrPayload(null, "c1"))
        assertEquals("https://minervaflow.app/c/c1", qrPayload("123", "c1"))
    }
}

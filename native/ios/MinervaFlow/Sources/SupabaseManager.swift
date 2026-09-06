import Foundation
import Supabase

@MainActor
final class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    @Published var isAuthenticated = false
    @Published var customer: Customer?
    @Published var transactions: [LoyaltyTransaction] = []
    @Published var rewards: [LoyaltyReward] = []
    @Published var redemptions: [RewardRedemption] = []
    @Published var offers: [Offer] = []
    @Published var restaurantName: String?
    @Published var isLoadingData = false
    /// Surfaced by any screen after a failed network/RPC call — cleared the
    /// next time that screen's action is retried. Centralized here rather
    /// than each view inventing its own error state, so every screen fails
    /// the same way instead of some showing nothing at all.
    @Published var lastError: String?

    private init() {
        client = SupabaseClient(supabaseURL: Config.supabaseURL, supabaseKey: Config.supabaseAnonKey)
        Task { await observeAuthState() }
    }

    private func observeAuthState() async {
        for await state in client.auth.authStateChanges {
            if state.event == .signedIn || state.event == .initialSession {
                isAuthenticated = state.session != nil
                if state.session != nil { await loadPortalData() }
            } else if state.event == .signedOut {
                isAuthenticated = false
                customer = nil
                transactions = []
            }
        }
    }

    /// Step 1 of native login: sends a one-time code by email. Same
    /// `is_customer` signup flag the web magic-link flow uses (see
    /// lib/auth/customer-magic-link.ts) so the DB trigger skips the
    /// default-restaurant/owner provisioning a brand-new auth user would
    /// otherwise get. `shouldCreateUser: false` on a second attempt for an
    /// existing customer is intentionally NOT set here — sending the OTP
    /// again for an existing user is harmless and simpler than tracking
    /// "have we seen this email before" client-side.
    func sendCode(email: String, marketingOptIn: Bool) async throws {
        try await client.auth.signInWithOTP(
            email: email,
            data: ["is_customer": .bool(true), "marketing_opt_in": .bool(marketingOptIn)]
        )
    }

    /// Step 2: verifies the 6-digit code from that email. On success,
    /// authStateChanges fires .signedIn and loadPortalData() runs.
    func verifyCode(email: String, code: String) async throws {
        // signInWithOTP(email:) with no explicit type always requests a
        // "magiclink"-type OTP server-side — verifying with any other
        // EmailOTPType case fails even with the correct code.
        try await client.auth.verifyOTP(email: email, token: code, type: .magiclink)
    }

    func signOut() async {
        try? await client.auth.signOut()
    }

    /// Loads the same data surface the web portal's Home tab shows for the
    /// current session's own customer row(s) — RLS (customers_select_own)
    /// is the actual trust boundary, this just picks the first restaurant
    /// relationship rather than offering the multi-restaurant chooser the
    /// web portal has (fine for Phase 1 — most loyalty customers belong to
    /// exactly one restaurant).
    func loadPortalData() async {
        isLoadingData = true
        defer { isLoadingData = false }
        do {
            let customers: [Customer] = try await client
                .from("customers")
                .select()
                .execute()
                .value
            guard let mine = customers.first else {
                customer = nil
                return
            }
            customer = mine

            async let txsFetch: [LoyaltyTransaction] = client
                .from("loyalty_transactions")
                .select()
                .eq("customer_id", value: mine.id)
                .order("created_at", ascending: false)
                .limit(20)
                .execute()
                .value

            async let rewardsFetch: [LoyaltyReward] = client
                .from("loyalty_rewards")
                .select()
                .eq("restaurant_id", value: mine.restaurantId)
                .eq("active", value: true)
                .order("points_cost", ascending: true)
                .execute()
                .value

            async let offersFetch: [Offer] = client
                .from("offers")
                .select()
                .eq("restaurant_id", value: mine.restaurantId)
                .eq("active", value: true)
                .execute()
                .value

            struct RestaurantNameRow: Codable { let name: String }
            async let restaurantFetch: RestaurantNameRow = client
                .from("restaurants")
                .select("name")
                .eq("id", value: mine.restaurantId)
                .single()
                .execute()
                .value

            async let redemptionsFetch: [RewardRedemption] = client
                .from("reward_redemptions")
                .select()
                .eq("customer_id", value: mine.id)
                .order("created_at", ascending: false)
                .execute()
                .value

            let (txs, rewardsResult, offersResult, restaurantRow, redemptionsResult) = try await (
                txsFetch, rewardsFetch, offersFetch, restaurantFetch, redemptionsFetch
            )
            transactions = txs
            rewards = rewardsResult
            offers = offersResult.filter { $0.isLive }
            restaurantName = restaurantRow.name
            redemptions = redemptionsResult
        } catch {
            // Loading is best-effort here: a transient network blip shouldn't
            // wipe out whatever the last successful load already put on
            // screen (pull-to-refresh keeps showing stale-but-real data
            // instead of blanking out), but it's still surfaced so the user
            // knows a refresh silently failed rather than assuming it's current.
            lastError = "La mise à jour a échoué. Vérifiez votre connexion et réessayez."
            print("loadPortalData error: \(error)")
        }
    }

    /// Self-serve profile update, now that customers_update_own actually
    /// exists (see supabase/migrations/0066_customer_self_service.sql) — a
    /// real RLS-scoped table update, not a bridge API call, since a
    /// customer updating their own row is exactly what that policy is for.
    func updateNotificationFrequency(_ frequency: String) async -> Bool {
        guard let customerId = customer?.id else { return false }
        do {
            struct Patch: Encodable { let notification_frequency: String }
            try await client
                .from("customers")
                .update(Patch(notification_frequency: frequency))
                .eq("id", value: customerId)
                .execute()
            if let mine = customer {
                customer = Customer(
                    id: mine.id,
                    restaurantId: mine.restaurantId,
                    name: mine.name,
                    visitCount: mine.visitCount,
                    totalSpent: mine.totalSpent,
                    loyaltyPoints: mine.loyaltyPoints,
                    notificationFrequency: frequency,
                    favoriteOfferIds: mine.favoriteOfferIds
                )
            }
            return true
        } catch {
            lastError = "La mise à jour de vos préférences a échoué. Réessayez."
            print("updateNotificationFrequency error: \(error)")
            return false
        }
    }

    /// Self-serve redemption: self_redeem_reward re-derives the caller's own
    /// customer row from auth.uid() and re-checks the points balance
    /// server-side (see supabase/migrations/0040_reward_redemptions.sql) —
    /// this is a thin pass-through, not the trust boundary, same as the web
    /// portal's selfRedeemReward. Optimistically updates local state on
    /// success so the UI reflects the new balance immediately, matching
    /// how updateMyProfileAction's UI-side counterpart behaves on web.
    func redeem(reward: LoyaltyReward) async -> Bool {
        do {
            struct RedeemParams: Encodable { let p_reward_id: String }
            let redemption: RewardRedemption = try await client
                .rpc("self_redeem_reward", params: RedeemParams(p_reward_id: reward.id))
                .single()
                .execute()
                .value
            redemptions.insert(redemption, at: 0)
            if var mine = customer {
                mine = Customer(
                    id: mine.id,
                    restaurantId: mine.restaurantId,
                    name: mine.name,
                    visitCount: mine.visitCount,
                    totalSpent: mine.totalSpent,
                    loyaltyPoints: mine.loyaltyPoints - redemption.pointsSpent,
                    notificationFrequency: mine.notificationFrequency,
                    favoriteOfferIds: mine.favoriteOfferIds
                )
                customer = mine
            }
            return true
        } catch {
            lastError = "L'échange a échoué. Vos points n'ont pas été déduits, réessayez."
            print("redeem error: \(error)")
            return false
        }
    }
}

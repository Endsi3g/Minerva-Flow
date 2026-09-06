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
    @Published var menuItems: [NativeMenuItem] = []
    @Published var taxRate: Double = 0.14975
    @Published var acceptsTips: Bool = true
    @Published var referralPrograms: [ReferralProgress] = []
    @Published var isLoadingData = false
    @Published var isLoadingMenu = false
    @Published var isLoadingReferrals = false
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

    /// Google/Facebook via ASWebAuthenticationSession (the supabase-swift
    /// SDK's own overload — no manual URL/session plumbing needed beyond
    /// registering the callback scheme, see Config.oauthRedirectURL and
    /// project.yml's CFBundleURLTypes). handle_new_user() links this to an
    /// existing customer row by email even though OAuth can't carry the
    /// is_customer metadata flag the OTP path uses (see
    /// supabase/migrations/0067_oauth_customer_login.sql) — requires the
    /// provider to actually be enabled in the Supabase dashboard with real
    /// credentials, which is a one-time manual step, not something this
    /// code can do for itself.
    func signInWithOAuth(provider: Provider) async throws {
        try await client.auth.signInWithOAuth(provider: provider, redirectTo: Config.oauthRedirectURL)
    }

    #if DEBUG
    /// Password-grant sign-in against the seeded dev customer (see
    /// Config.devTestEmail) — a real Supabase session, so it still goes
    /// through RLS like any other login, just skipping the email round-trip
    /// while OTP delivery is being debugged separately.
    func signInWithDevTestAccount() async throws {
        try await client.auth.signIn(email: Config.devTestEmail, password: Config.devTestPassword)
    }
    #endif

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

    // MARK: - Commander (bridge API — Server Actions aren't reachable from
    // native, see app/api/portal/* and lib/auth/native-bearer.ts)

    private func bearerToken() async -> String? {
        try? await client.auth.session.accessToken
    }

    /// Wraps a native bridge call with the defensive behavior a real
    /// network request needs and a bare URLSession call does not get for
    /// free: a bounded timeout (so a stalled connection fails in seconds,
    /// not hangs the UI indefinitely), and a distinction between "no
    /// internet at all" (clear, actionable message) and any other failure.
    private func authorizedRequest(_ url: URL, method: String = "GET", body: Data? = nil) async throws -> Data {
        guard let token = await bearerToken() else {
            throw URLError(.userAuthenticationRequired)
        }
        var request = URLRequest(url: url, timeoutInterval: 15)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return data
    }

    /// Irreversible: same deleteMyAccount the web portal's
    /// deleteMyAccountAction calls (app/api/portal/account/route.ts), over
    /// the Bearer-token bridge instead of a session cookie. Signs the local
    /// session out afterward regardless of the network result's specifics —
    /// once the server confirms deletion there is no account left to stay
    /// signed into.
    func deleteAccount() async -> Bool {
        do {
            _ = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/portal/account"),
                method: "DELETE"
            )
            await signOut()
            return true
        } catch {
            lastError = "La suppression du compte a échoué. Réessayez."
            print("deleteAccount error: \(error)")
            return false
        }
    }

    func fetchMenu() async {
        isLoadingMenu = true
        defer { isLoadingMenu = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/menu"))
            let decoded = try JSONDecoder().decode(MenuResponse.self, from: data)
            menuItems = decoded.items.filter(\.active)
            taxRate = decoded.taxRate
            acceptsTips = decoded.acceptsTips
        } catch let error as URLError where error.code == .notConnectedToInternet {
            lastError = "Aucune connexion internet. Vérifiez votre réseau et réessayez."
        } catch {
            lastError = "Le menu n'a pas pu être chargé. Réessayez."
            print("fetchMenu error: \(error)")
        }
    }

    /// Referral programs are read via the bridge for the same reason the
    /// menu is: referral_programs has no customer-facing RLS policy (see
    /// app/api/portal/referrals/route.ts's own doc comment) — a loyalty
    /// customer is never a restaurant_members row.
    func fetchReferrals() async {
        isLoadingReferrals = true
        defer { isLoadingReferrals = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/referrals"))
            referralPrograms = try JSONDecoder().decode(ReferralsResponse.self, from: data).programs
        } catch {
            lastError = "Les programmes de parrainage n'ont pas pu être chargés."
            print("fetchReferrals error: \(error)")
        }
    }

    /// Creates (or fetches the existing) referral link for one program,
    /// then updates that program's entry in-place so the share sheet has
    /// something to share immediately without a full reload.
    func createReferralLink(for programId: String) async -> ReferralLink? {
        struct Body: Encodable { let programId: String }
        struct Response: Decodable { let link: ReferralLink? }
        do {
            let bodyData = try JSONEncoder().encode(Body(programId: programId))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/portal/referrals"),
                method: "POST",
                body: bodyData
            )
            let link = try JSONDecoder().decode(Response.self, from: data).link
            if let link, let index = referralPrograms.firstIndex(where: { $0.program.id == programId }) {
                referralPrograms[index] = ReferralProgress(program: referralPrograms[index].program, link: link)
            }
            return link
        } catch {
            lastError = "Impossible de créer votre lien de parrainage. Réessayez."
            print("createReferralLink error: \(error)")
            return nil
        }
    }

    struct OrderResult { let ok: Bool; let orderId: String? }

    func submitOrder(cart: [String: Int], tipAmount: Double, paymentMethod: String?) async -> OrderResult {
        struct CartLine: Encodable { let menuItemId: String; let quantity: Int }
        struct OrderBody: Encodable { let cart: [CartLine]; let tipAmount: Double; let paymentMethod: String? }
        struct OrderResponse: Decodable { let ok: Bool; let orderId: String? }

        let lines = cart.compactMap { key, qty -> CartLine? in
            qty > 0 ? CartLine(menuItemId: key, quantity: qty) : nil
        }
        guard !lines.isEmpty else { return OrderResult(ok: false, orderId: nil) }

        do {
            let bodyData = try JSONEncoder().encode(OrderBody(cart: lines, tipAmount: tipAmount, paymentMethod: paymentMethod))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/portal/orders"),
                method: "POST",
                body: bodyData
            )
            let decoded = try JSONDecoder().decode(OrderResponse.self, from: data)
            return OrderResult(ok: decoded.ok, orderId: decoded.orderId)
        } catch let error as URLError where error.code == .notConnectedToInternet {
            lastError = "Aucune connexion internet. Votre commande n'a pas été envoyée."
            return OrderResult(ok: false, orderId: nil)
        } catch {
            lastError = "La commande a échoué. Réessayez."
            print("submitOrder error: \(error)")
            return OrderResult(ok: false, orderId: nil)
        }
    }
}

import Foundation
import Supabase
import WidgetKit

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
    @Published var restaurantGoogleMapsUrl: String?
    @Published var loyaltyTier2Threshold: Double = 150
    @Published var loyaltyTier3Threshold: Double = 400
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

            async let redemptionsFetch: [RewardRedemption] = client
                .from("reward_redemptions")
                .select()
                .eq("customer_id", value: mine.id)
                .order("created_at", ascending: false)
                .execute()
                .value

            let (txs, rewardsResult, offersResult, redemptionsResult) = try await (
                txsFetch, rewardsFetch, offersFetch, redemptionsFetch
            )
            transactions = txs
            rewards = rewardsResult
            offers = offersResult.filter { $0.isLive }
            redemptions = redemptionsResult
            await fetchRestaurantInfo()
            saveWidgetSnapshot(for: mine)
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

    /// Writes the home-screen widget's entire data diet to the shared App
    /// Group container, then asks WidgetKit to redraw immediately — a
    /// widget has no way to notice this on its own, it only re-reads on
    /// its own schedule (see MinervaFlowWidget's TimelineProvider)
    /// otherwise.
    private func saveWidgetSnapshot(for mine: Customer) {
        let tier = LoyaltyTier.resolve(totalSpent: mine.totalSpent, tier2: loyaltyTier2Threshold, tier3: loyaltyTier3Threshold)
        let tierHex: String
        switch tier {
        case .habitue: tierHex = "167F5B"
        case .privilegie: tierHex = "0E5A40"
        case .ambassadeur: tierHex = "DFFF5F"
        }
        PointsSnapshot(
            customerName: mine.name,
            restaurantName: restaurantName ?? "Minerva Flow",
            points: mine.loyaltyPoints,
            tierLabel: tier.label,
            tierColorHex: tierHex,
            tierIsLight: tier == .ambassadeur,
            updatedAt: Date()
        ).save()
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Same customers_update_own RLS policy — a customer changing their own
    /// display name is exactly what it's for, direct table update, no
    /// bridge needed.
    func updateName(_ name: String) async -> Bool {
        guard let customerId = customer?.id else { return false }
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return false }
        do {
            struct Patch: Encodable { let name: String }
            try await client
                .from("customers")
                .update(Patch(name: trimmed))
                .eq("id", value: customerId)
                .execute()
            customer?.name = trimmed
            return true
        } catch {
            lastError = "La mise à jour de votre nom a échoué. Réessayez."
            print("updateName error: \(error)")
            return false
        }
    }

    /// Same customers_update_own RLS policy — lets the restaurant's own
    /// Clients page (staff-facing) reach a customer by phone, since a
    /// customer's own portal/native profile is the only place that number
    /// ever gets entered for a self-enrolled loyalty account.
    func updatePhone(_ phone: String) async -> Bool {
        guard let customerId = customer?.id else { return false }
        let trimmed = phone.trimmingCharacters(in: .whitespaces)
        do {
            struct Patch: Encodable { let phone: String? }
            try await client
                .from("customers")
                .update(Patch(phone: trimmed.isEmpty ? nil : trimmed))
                .eq("id", value: customerId)
                .execute()
            customer?.phone = trimmed.isEmpty ? nil : trimmed
            return true
        } catch {
            lastError = "La mise à jour de votre numéro a échoué. Réessayez."
            print("updatePhone error: \(error)")
            return false
        }
    }

    /// Uploads to the same "avatars" storage bucket the web portal uses
    /// (per-auth.uid() folder policy, see
    /// supabase/migrations/0068_customer_profile_editing.sql's own
    /// comment), then persists the resulting public URL onto the
    /// customer's own row via customers_update_own.
    func uploadAvatar(imageData: Data) async -> Bool {
        guard let customerId = customer?.id, let userId = try? await client.auth.session.user.id else { return false }
        do {
            let path = "\(userId)/avatar-\(Int(Date().timeIntervalSince1970)).jpg"
            try await client.storage.from("avatars").upload(
                path,
                data: imageData,
                options: FileOptions(contentType: "image/jpeg", upsert: true)
            )
            let publicURL = try client.storage.from("avatars").getPublicURL(path: path)

            struct Patch: Encodable { let avatar_url: String }
            try await client
                .from("customers")
                .update(Patch(avatar_url: publicURL.absoluteString))
                .eq("id", value: customerId)
                .execute()
            customer?.avatarUrl = publicURL.absoluteString
            return true
        } catch {
            lastError = "L'envoi de la photo a échoué. Réessayez."
            print("uploadAvatar error: \(error)")
            return false
        }
    }

    enum EmailChangeResult { case sent, failure(String) }

    /// Supabase sends a confirmation link to the NEW address before the
    /// change takes effect — customers.email syncs automatically once that
    /// link is clicked (see
    /// supabase/migrations/0068_customer_profile_editing.sql's
    /// on_auth_user_email_change trigger), so nothing here writes
    /// customers.email directly.
    func requestEmailChange(_ newEmail: String) async -> EmailChangeResult {
        do {
            try await client.auth.update(user: UserAttributes(email: newEmail))
            return .sent
        } catch {
            return .failure("La demande a échoué. Vérifiez l'adresse et réessayez.")
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
            customer?.notificationFrequency = frequency
            return true
        } catch {
            lastError = "La mise à jour de vos préférences a échoué. Réessayez."
            print("updateNotificationFrequency error: \(error)")
            return false
        }
    }

    /// Lets a customer see and change their own marketing consent after
    /// signup — closes a real gap where the AuthView signup checkbox set
    /// this once and there was never a way to revisit it. Mirrors the web
    /// portal's updateMyProfileAction: opting out only flips
    /// marketing_consent to false and leaves consent_source/consent_at
    /// alone (an audit trail of when consent was originally given, not
    /// something opting out should erase); opting in (re)stamps both.
    func updateMarketingConsent(_ optedIn: Bool) async -> Bool {
        guard let customerId = customer?.id else { return false }
        do {
            if optedIn {
                struct Patch: Encodable { let marketing_consent: Bool; let consent_source: String; let consent_at: String }
                let patch = Patch(marketing_consent: true, consent_source: "native_profile", consent_at: ISO8601DateFormatter().string(from: Date()))
                try await client.from("customers").update(patch).eq("id", value: customerId).execute()
            } else {
                struct Patch: Encodable { let marketing_consent: Bool }
                try await client.from("customers").update(Patch(marketing_consent: false)).eq("id", value: customerId).execute()
            }
            customer?.marketingConsent = optedIn
            return true
        } catch {
            lastError = "La mise à jour de vos préférences a échoué. Réessayez."
            print("updateMarketingConsent error: \(error)")
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
            customer?.loyaltyPoints -= redemption.pointsSpent
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

    /// Restaurant name + tier thresholds via the bridge (see
    /// app/api/portal/restaurant/route.ts) — `restaurants` has no
    /// customer-facing RLS policy, and it never should get a blanket one:
    /// the table also holds stripe_connect_account_id and financial
    /// planning columns that must never reach a customer's device. Best
    /// effort: a failure here leaves the existing name/thresholds (or
    /// their defaults) in place rather than surfacing an error banner for
    /// what's a secondary, non-blocking piece of the Home/Profile screens.
    func fetchRestaurantInfo() async {
        struct RestaurantInfoResponse: Decodable {
            let name: String
            let loyaltyTier2Threshold: Double
            let loyaltyTier3Threshold: Double
            let googleMapsUrl: String?
        }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/restaurant"))
            let decoded = try JSONDecoder().decode(RestaurantInfoResponse.self, from: data)
            restaurantName = decoded.name
            loyaltyTier2Threshold = decoded.loyaltyTier2Threshold
            loyaltyTier3Threshold = decoded.loyaltyTier3Threshold
            restaurantGoogleMapsUrl = decoded.googleMapsUrl
        } catch {
            print("fetchRestaurantInfo error: \(error)")
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
    /// Pre-generates any missing referral link immediately after loading —
    /// sharing a referral should be a single tap (share the already-ready
    /// link/QR), never "tap once to create a link, then tap again to
    /// share it." A program the caller has never had a link for gets one
    /// silently, right here, before the screen ever renders.
    func fetchReferrals() async {
        isLoadingReferrals = true
        defer { isLoadingReferrals = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/referrals"))
            var programs = try JSONDecoder().decode(ReferralsResponse.self, from: data).programs
            for index in programs.indices where programs[index].link == nil {
                if let link = await createReferralLink(for: programs[index].program.id) {
                    programs[index] = ReferralProgress(program: programs[index].program, link: link)
                }
            }
            referralPrograms = programs
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

    // MARK: - Restaurant discovery (map)

    @Published var nearbyRestaurants: [DiscoverRestaurant] = []
    @Published var isLoadingDiscover = false

    /// Every restaurant with coordinates on file, via the bridge (see
    /// app/api/portal/discover/route.ts's own comment on why this can't be
    /// a direct RLS-scoped read: `restaurants` also holds
    /// stripe_connect_account_id and financial-planning columns).
    func fetchNearbyRestaurants() async {
        isLoadingDiscover = true
        defer { isLoadingDiscover = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/discover"))
            nearbyRestaurants = try JSONDecoder().decode(DiscoverListResponse.self, from: data).restaurants
        } catch {
            lastError = "Impossible de charger les restaurants à proximité."
            print("fetchNearbyRestaurants error: \(error)")
        }
    }

    func fetchRestaurantDetail(id: String) async -> DiscoverRestaurantResponse? {
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/discover/\(id)"))
            return try JSONDecoder().decode(DiscoverRestaurantResponse.self, from: data)
        } catch {
            lastError = "Impossible de charger ce restaurant."
            print("fetchRestaurantDetail error: \(error)")
            return nil
        }
    }

    enum ScanResult { case success(restaurant: (id: String, name: String)); case failure(String) }

    /// Resolves a scanned table QR (the same menu_shares token the web's
    /// own /m/[token] ordering page uses) to a restaurant — see
    /// app/api/portal/scan/[token]/route.ts's own comment.
    func resolveScanToken(_ token: String) async -> ScanResult {
        struct ScanResponse: Decodable { let restaurantId: String; let restaurantName: String }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/scan/\(token)"))
            let decoded = try JSONDecoder().decode(ScanResponse.self, from: data)
            return .success(restaurant: (id: decoded.restaurantId, name: decoded.restaurantName))
        } catch {
            print("resolveScanToken error: \(error)")
            return .failure("Ce code ne correspond à aucun restaurant Minerva Flow.")
        }
    }

    // MARK: - Menu item reviews (public read via RLS, no bridge needed)

    /// menu_item_reviews_public_select has no auth requirement (see
    /// 0069_menu_ratings_and_push_tokens.sql's own comment — same
    /// Google-Maps-style reasoning: someone deciding whether to visit a
    /// restaurant needs to see its ratings before they're a customer
    /// there), so this reads directly through the client, no bridge.
    func fetchReviews(forMenuItem menuItemId: String) async -> [MenuItemReview] {
        do {
            let reviews: [MenuItemReview] = try await client
                .from("menu_item_reviews")
                .select()
                .eq("menu_item_id", value: menuItemId)
                .order("created_at", ascending: false)
                .execute()
                .value
            return reviews
        } catch {
            print("fetchReviews error: \(error)")
            return []
        }
    }

    /// menu_item_reviews_customer_insert requires the caller to actually
    /// be a loyalty customer of that specific restaurant — reviewing a
    /// place with no relationship to it isn't possible, by RLS, not just
    /// UI convention.
    func submitReview(menuItemId: String, restaurantId: String, rating: Int, comment: String?) async -> Bool {
        guard let customerId = customer?.id else { return false }
        do {
            struct NewReview: Encodable {
                let menu_item_id: String
                let restaurant_id: String
                let customer_id: String
                let rating: Int
                let comment: String?
            }
            try await client
                .from("menu_item_reviews")
                .upsert(NewReview(menu_item_id: menuItemId, restaurant_id: restaurantId, customer_id: customerId, rating: rating, comment: comment), onConflict: "menu_item_id,customer_id")
                .execute()
            return true
        } catch {
            lastError = "L'envoi de votre avis a échoué. Réessayez."
            print("submitReview error: \(error)")
            return false
        }
    }

    // MARK: - Push notifications

    /// device_push_tokens_owner_all (auth.uid() = user_id) makes this a
    /// direct, RLS-scoped upsert — no bridge needed. Actually delivering a
    /// push still requires a real APNs auth key configured server-side
    /// (see native/ios/build-status.html); this half of the pipeline
    /// (permission, registration, token storage) works regardless of that.
    func registerPushToken(_ tokenData: Data) async {
        let token = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
        guard let userId = try? await client.auth.session.user.id else { return }
        do {
            struct TokenRow: Encodable {
                let user_id: UUID
                let token: String
                let platform: String
            }
            try await client
                .from("device_push_tokens")
                .upsert(TokenRow(user_id: userId, token: token, platform: "ios"), onConflict: "user_id,token")
                .execute()
        } catch {
            print("registerPushToken error: \(error)")
        }
    }
}

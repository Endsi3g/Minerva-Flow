import Foundation
import Supabase
import WidgetKit
import AuthenticationServices
import CryptoKit

@MainActor
final class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    @Published var isAuthenticated = false
    @Published private(set) var authUserID: UUID?
    @Published var customer: Customer?
    @Published var transactions: [LoyaltyTransaction] = []
    @Published var rewards: [LoyaltyReward] = []
    @Published var redemptions: [RewardRedemption] = []
    @Published var offers: [Offer] = []
    @Published var birthdayOffer: Offer?
    @Published var restaurantName: String?
    @Published var restaurantCity: String?
    @Published var restaurantTimezone: TimeZone = .current
    @Published var restaurantGoogleMapsUrl: String?
    @Published var restaurantGooglePlaceId: String?
    /// Manual "on est débordés" toggle OR live en_preparation count over the owner's threshold — same signal as the web menu's delay banner (see computeIsBusy).
    @Published var restaurantIsBusy: Bool = false
    /// The rotating card-pairing code (MyCardView) and its lifecycle state.
    /// Minted fresh per screen-appearance/regeneration, never persisted
    /// beyond this session — see mint_pairing_code in
    /// supabase/migrations/0086_pairing_codes.sql.
    @Published var pairingCode: String?
    @Published var pairingCodeExpiresAt: Date?
    @Published var isMintingPairingCode = false
    @Published var pairingCodeError: String?
    @Published var loyaltyTier2Threshold: Double = 150
    @Published var loyaltyTier3Threshold: Double = 400
    @Published var announcements: [PlatformAnnouncement] = []
    @Published var menuItems: [NativeMenuItem] = []
    @Published var customerMealSuggestions: [NativeMealSuggestion] = []
    @Published var taxRate: Double = 0.14975
    @Published var acceptsTips: Bool = true
    @Published var onlinePaymentEnabled: Bool = false
    @Published var canPayAtReceipt: Bool = true
    @Published var canPayOnline: Bool = false
    @Published var pickupEnabled: Bool = true
    @Published var deliveryEnabled: Bool = false
    @Published var referralPrograms: [ReferralProgress] = []
    /// Every restaurant loyalty relationship this account has, and the
    /// points/rewards history across all of them combined — a customer can
    /// legitimately belong to more than one participating restaurant, and
    /// "membre fidèle" / the card's history should reflect that instead of
    /// only ever showing the single restaurant `customer`/`transactions`
    /// above are scoped to (which stays as-is: Home/Commander/Rewards are
    /// inherently one-restaurant-at-a-time screens, this is additive).
    @Published var allMemberships: [RestaurantMembership] = []
    @Published var allTransactions: [LoyaltyTransaction] = []
    @Published var allRedemptions: [RewardRedemption] = []
    @Published var isLoadingData = false
    @Published var isLoadingMenu = false
    @Published private(set) var isUsingDemoMenuFallback = false
    @Published var isLoadingReferrals = false
    /// Surfaced by any screen after a failed network/RPC call — cleared the
    /// next time that screen's action is retried. Centralized here rather
    /// than each view inventing its own error state, so every screen fails
    /// the same way instead of some showing nothing at all.
    @Published var lastError: String? {
        didSet {
            guard let message = lastError else { return }
            // Errors are actionable feedback, not global navigation state.
            // Auto-expire them so a failure on one tab cannot reappear as an
            // alert after the user changes tabs several seconds later.
            Task { @MainActor [weak self] in
                try? await Task.sleep(nanoseconds: 6_000_000_000)
                guard let self, self.lastError == message else { return }
                self.lastError = nil
            }
        }
    }
    /// Native owner/manager mode is resolved from the authenticated user's
    /// restaurant membership, never from a client-side flag.
    @Published var isOwnerExperience = false
    /// Prevents a freshly authenticated owner from briefly seeing the
    /// customer onboarding while memberships are still being resolved.
    @Published var isResolvingExperience = false
    @Published var experienceResolutionError: String?
    @Published var ownerRestaurants: [NativeOwnerRestaurant] = []
    @Published var ownerBranding: NativeOwnerBranding?
    @Published var ownerMetrics = NativeOwnerMetrics()
    @Published var ownerOrders: [NativeOwnerOrder] = []
    @Published var ownerMenuItems: [NativeMenuItem] = []
    @Published var ownerMealSuggestions: [NativeMealSuggestion] = []
    @Published var ownerOffers: [Offer] = []
    @Published var ownerRewards: [NativeOwnerReward] = []
    @Published var ownerCustomers: [NativeOwnerCustomer] = []
    @Published var ownerEmployees: [NativeOwnerEmployee] = []
    @Published var ownerInventoryItems: [NativeOwnerInventoryItem] = []
    @Published var ownerTransactions: [NativeOwnerFinancialTransaction] = []
    @Published var ownerReviews: [NativeOwnerRestaurantReview] = []
    @Published var selectedOwnerRestaurantId: String?

    private init() {
        client = SupabaseClient(supabaseURL: Config.supabaseURL, supabaseKey: Config.supabaseAnonKey)
        Task { await observeAuthState() }
    }

    private func observeAuthState() async {
        for await state in client.auth.authStateChanges {
            if state.event == .signedIn || state.event == .initialSession {
                isAuthenticated = state.session != nil
                authUserID = state.session?.user.id
                if state.session != nil {
                    isResolvingExperience = true
                    experienceResolutionError = nil
                    let watchdog = Task { @MainActor [weak self] in
                        try? await Task.sleep(nanoseconds: 15_000_000_000)
                        guard !Task.isCancelled, let self else { return }
                        self.isResolvingExperience = false
                        self.experienceResolutionError = "La préparation de votre espace prend trop de temps. Vérifiez votre connexion, puis réessayez."
                    }
                    await loadPortalData()
                    watchdog.cancel()
                    isResolvingExperience = false
                }
            } else if state.event == .signedOut {
                isAuthenticated = false
                authUserID = nil
                isResolvingExperience = false
                experienceResolutionError = nil
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

    /// Native Sign in with Apple keeps the user inside the app. The web OAuth
    /// helper is still used for Google, but Apple must use AuthenticationServices
    /// to satisfy Apple's native sign-in UX and callback requirements.
    func signInWithApple() async throws {
        let rawNonce = AppleSignInCoordinator.randomNonce()
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = AppleSignInCoordinator.sha256(rawNonce)
        let credential = try await AppleSignInCoordinator.perform(request: request)
        guard let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            throw NSError(domain: "MinervaFlow.Auth", code: 1, userInfo: [NSLocalizedDescriptionKey: "Jeton Apple manquant."])
        }
        try await client.auth.signInWithIdToken(credentials: OpenIDConnectCredentials(
            provider: .apple,
            idToken: idToken,
            nonce: rawNonce
        ))
    }

    /// Returning customer, password already set (via signUpWithPassword or
    /// the web forgot-password flow) — same signIn(email:password:) call as
    /// the #if DEBUG dev bypass below, just with the customer's own
    /// credentials instead of the seeded test account.
    func signInWithPassword(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }

    /// Alternative to sendCode() for a customer who'd rather set a password
    /// than receive a code each time — same is_customer/marketing_opt_in
    /// metadata as the OTP path (see sendCode above) so handle_new_user()
    /// links/creates the customers row identically regardless of which
    /// method they signed up with. Unlike OAuth, signUp can carry arbitrary
    /// metadata, so this doesn't have OAuth's "must already have an
    /// unclaimed customers row" limitation — works for a brand-new customer.
    func signUpWithPassword(email: String, password: String, marketingOptIn: Bool) async throws {
        try await client.auth.signUp(
            email: email,
            password: password,
            data: ["is_customer": .bool(true), "marketing_opt_in": .bool(marketingOptIn)]
        )
    }

    /// Sends a reset link to a web page (there's no native "set new
    /// password" screen — the customer completes this in a browser, same
    /// as the legal documents sheet reuses the real web pages rather than
    /// duplicating them) and returns to the app to sign in with the new
    /// password. `next=/portal` tells that web page where a customer
    /// session should land instead of its default of /overview (a
    /// restaurant-staff-only route).
    func requestPasswordReset(email: String) async throws {
        try await client.auth.resetPasswordForEmail(
            email,
            redirectTo: URL(string: "https://minervaflow.app/update-password?next=%2Fportal")
        )
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
        birthdayOffer = nil
        defer { isLoadingData = false }
        do {
            await loadOwnerContext()
            if isOwnerExperience {
                return
            }
            // A customer can now belong to more than one restaurant (the
            // "Devenir client" browse-mode join, see RestaurantDetailView),
            // so this can legitimately return several rows for the same
            // account. Ordering by created_at picks the restaurant they
            // originally joined as "home" (Home/MyCardView/Commander all
            // key off this single `customer`) — deterministic and stable,
            // rather than whatever arbitrary order Postgres happens to
            // return. Every restaurant is still reachable via allMemberships.
            let customers: [Customer] = try await client
                .from("customers")
                .select()
                .order("created_at", ascending: true)
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

            async let announcementsFetch: [PlatformAnnouncement] = client
                .from("platform_announcements")
                .select()
                .eq("is_active", value: true)
                .order("created_at", ascending: false)
                .execute()
                .value

            let (txs, rewardsResult, offersResult, redemptionsResult, announcementsResult) = try await (
                txsFetch, rewardsFetch, offersFetch, redemptionsFetch, announcementsFetch
            )
            transactions = txs
            rewards = rewardsResult
            let liveOffers = offersResult.filter { $0.isLive }
            birthdayOffer = liveOffers.first(where: \.isBirthdaySpecial)
            offers = liveOffers.filter { !$0.isBirthdaySpecial }
            redemptions = redemptionsResult
            announcements = announcementsResult
            lastError = nil
            await fetchRestaurantInfo()
            saveWidgetSnapshot(for: mine)
            await fetchAllMemberships()
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

    func retryExperienceResolution() async {
        guard isAuthenticated else { return }
        isResolvingExperience = true
        experienceResolutionError = nil
        let watchdog = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 15_000_000_000)
            guard !Task.isCancelled, let self else { return }
            self.isResolvingExperience = false
            self.experienceResolutionError = "La préparation de votre espace prend trop de temps. Vérifiez votre connexion, puis réessayez."
        }
        await loadPortalData()
        watchdog.cancel()
        isResolvingExperience = false
    }

    /// Loads only the owner surface needed by the native shell. RLS policies
    /// on `restaurant_members` and `workspace_brand_settings` remain the
    /// authority; this query does not trust role data supplied by the app.
    private func loadOwnerContext() async {
        struct Membership: Decodable {
            let role: String
            let restaurantId: String
            let restaurant: NativeOwnerRestaurant?
            enum CodingKeys: String, CodingKey { case role, restaurantId = "restaurant_id", restaurant = "restaurants" }
        }
        do {
            let memberships: [Membership] = try await client
                .from("restaurant_members")
                .select("role, restaurant_id, restaurants(id, name, city, workspace_id)")
                .eq("status", value: "active")
                .execute()
                .value
            let privileged = memberships.filter { $0.role == "owner" || $0.role == "manager" }
            guard let first = privileged.first else {
                isOwnerExperience = false
                ownerRestaurants = []
                ownerBranding = nil
                ownerMetrics = NativeOwnerMetrics()
                return
            }
            isOwnerExperience = true
            ownerRestaurants = privileged.compactMap(\.restaurant)
            if selectedOwnerRestaurantId == nil || !ownerRestaurants.contains(where: { $0.id == selectedOwnerRestaurantId }) {
                selectedOwnerRestaurantId = first.restaurantId
            }
            await loadOwnerMetrics()
            await loadOwnerOrders()
            await loadOwnerOperations(for: selectedOwnerRestaurantId ?? first.restaurantId)
            await fetchOwnerMealSuggestions(for: selectedOwnerRestaurantId ?? first.restaurantId)
            if let workspaceId = first.restaurant?.workspaceId {
                struct Branding: Decodable {
                    let brandName: String
                    let logoUrl: String?
                    let primaryColor: String
                    let secondaryColor: String
                    let accentColor: String
                    enum CodingKeys: String, CodingKey {
                        case brandName = "brand_name", logoUrl = "logo_url", primaryColor = "primary_color", secondaryColor = "secondary_color", accentColor = "accent_color"
                    }
                }
                ownerBranding = try await client
                    .from("workspace_brand_settings")
                    .select("brand_name, logo_url, primary_color, secondary_color, accent_color")
                    .eq("workspace_id", value: workspaceId)
                    .single()
                    .execute()
                    .value
            }
        } catch {
            // A customer session can legitimately receive no membership rows;
            // only surface errors for a session that looked privileged.
            isOwnerExperience = false
            ownerRestaurants = []
            ownerBranding = nil
            ownerMetrics = NativeOwnerMetrics()
            print("loadOwnerContext error: \(error)")
        }
    }

    private func loadOwnerMetrics() async {
        let startOfMonth = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: Date())) ?? Date()
        let iso = ISO8601DateFormatter().string(from: startOfMonth)
        var metrics = NativeOwnerMetrics()
        for restaurant in ownerRestaurants {
            do {
                struct ServiceDay: Decodable { let revenue: Double }
                let days: [ServiceDay] = try await client.from("service_days").select("revenue").eq("restaurant_id", value: restaurant.id).gte("date", value: String(iso.prefix(10))).execute().value
                metrics.monthRevenue += days.reduce(0) { $0 + $1.revenue }
                struct OrderRow: Decodable { let id: String }
                let orders: [OrderRow] = try await client.from("orders").select("id").eq("restaurant_id", value: restaurant.id).gte("created_at", value: iso).neq("status", value: "annulee").execute().value
                metrics.monthOrders += orders.count
            } catch {
                print("loadOwnerMetrics error: \(error)")
            }
        }
        ownerMetrics = metrics
    }

    private func loadOwnerOrders() async {
        var result: [NativeOwnerOrder] = []
        let restaurants = ownerRestaurants.filter { selectedOwnerRestaurantId == nil || $0.id == selectedOwnerRestaurantId }
        for restaurant in restaurants {
            do {
                let rows: [NativeOwnerOrder] = try await client.from("orders").select("id, restaurant_id, status, guest_name, total, created_at, requested_ready_at, order_kind").eq("restaurant_id", value: restaurant.id).order("created_at", ascending: false).limit(50).execute().value
                result.append(contentsOf: rows)
            } catch { print("loadOwnerOrders error: \(error)") }
        }
        ownerOrders = result.sorted { $0.createdAt > $1.createdAt }
    }

    /// All owner pages read directly through the caller's Supabase session.
    /// The member RLS policies remain the authorization boundary, including
    /// for the mutation methods below; no service-role credential is ever
    /// embedded in the iOS application.
    private func loadOwnerOperations(for restaurantId: String) async {
        do {
            async let menus: [NativeMenuItem] = client.from("menu_items").select().eq("restaurant_id", value: restaurantId).order("name", ascending: true).execute().value
            async let offers: [Offer] = client.from("offers").select().eq("restaurant_id", value: restaurantId).order("created_at", ascending: false).execute().value
            async let rewards: [NativeOwnerReward] = client.from("loyalty_rewards").select("id, name, description, points_cost, active").eq("restaurant_id", value: restaurantId).order("points_cost", ascending: true).execute().value
            async let customers: [NativeOwnerCustomer] = client.from("customers").select("id, name, email, phone, loyalty_points, visit_count, total_spent").eq("restaurant_id", value: restaurantId).order("created_at", ascending: false).limit(100).execute().value
            async let employees: [NativeOwnerEmployee] = client.from("employees").select("id, full_name, role_title, hourly_wage, active").eq("restaurant_id", value: restaurantId).order("full_name", ascending: true).execute().value
            async let inventory: [NativeOwnerInventoryItem] = client.from("inventory_items").select("id, name, quantity_on_hand, unit, par_level, unit_cost, supplier_id").eq("restaurant_id", value: restaurantId).order("name", ascending: true).execute().value
            async let transactions: [NativeOwnerFinancialTransaction] = client.from("financial_transactions").select("id, date, description, amount, direction, category").eq("restaurant_id", value: restaurantId).order("date", ascending: false).limit(50).execute().value
            async let reviews: [NativeOwnerRestaurantReview] = client.from("restaurant_reviews").select("id, rating, comment, owner_response, created_at").eq("restaurant_id", value: restaurantId).order("created_at", ascending: false).limit(50).execute().value
            let result = try await (menus, offers, rewards, customers, employees, inventory, transactions, reviews)
            ownerMenuItems = result.0
            ownerOffers = result.1
            ownerRewards = result.2
            ownerCustomers = result.3
            ownerEmployees = result.4
            ownerInventoryItems = result.5
            ownerTransactions = result.6
            ownerReviews = result.7
        } catch {
            print("loadOwnerOperations error: \(error)")
        }
    }

    var selectedOwnerRestaurant: NativeOwnerRestaurant? {
        ownerRestaurants.first(where: { $0.id == selectedOwnerRestaurantId })
    }

    func selectOwnerRestaurant(_ restaurantId: String) async {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }) else { return }
        selectedOwnerRestaurantId = restaurantId
        await loadOwnerOrders()
        await loadOwnerOperations(for: restaurantId)
        await fetchOwnerMealSuggestions(for: restaurantId)
    }

    /// Persists the required establishment name during the native owner setup
    /// flow. The authenticated Supabase session and RLS policy remain the
    /// authority; no demo/local data is written.
    func updateOwnerRestaurantName(_ name: String) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId else { return false }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        struct Patch: Encodable { let name: String }
        do {
            try await client.from("restaurants").update(Patch(name: trimmed)).eq("id", value: restaurantId).execute()
            await loadOwnerContext()
            return true
        } catch {
            lastError = "Impossible d’enregistrer le nom de l’établissement."
            print("updateOwnerRestaurantName error: \(error)")
            return false
        }
    }

    func refreshOwnerOperations() async {
        guard let restaurantId = selectedOwnerRestaurantId else { return }
        await loadOwnerMetrics()
        await loadOwnerOrders()
        await loadOwnerOperations(for: restaurantId)
        await fetchOwnerMealSuggestions(for: restaurantId)
    }

    /// Search an owner's current restaurant by a customer's phone number.
    /// The RPC returns only identity fields, never points or spending totals.
    func lookupOwnerCustomersByPhone(_ phone: String) async -> [NativeOwnerCustomerLookup] {
        guard isOwnerExperience,
              let restaurantId = selectedOwnerRestaurantId,
              ownerRestaurants.contains(where: { $0.id == restaurantId }) else {
            lastError = "Aucun établissement autorisé n’est sélectionné."
            return []
        }
        let digits = phone.filter(\.isNumber)
        guard digits.count >= 7 else { return [] }
        struct Params: Encodable { let p_restaurant_id: String; let p_phone: String }
        do {
            lastError = nil
            return try await client.rpc(
                "lookup_customer_by_phone",
                params: Params(p_restaurant_id: restaurantId, p_phone: phone)
            ).execute().value
        } catch {
            lastError = "La recherche client a échoué. Vérifiez le numéro et réessayez."
            print("lookupOwnerCustomersByPhone error: \(error)")
            return []
        }
    }

    /// Reveals the loyalty balance only after the server confirms that the
    /// customer's active six-digit card code belongs to this exact phone hit.
    func confirmOwnerCustomerIdentity(
        _ customer: NativeOwnerCustomerLookup,
        code: String
    ) async -> NativeCounterCustomer? {
        guard isOwnerExperience,
              let restaurantId = selectedOwnerRestaurantId,
              ownerRestaurants.contains(where: { $0.id == restaurantId }),
              code.count == 6, code.allSatisfy(\.isNumber) else { return nil }
        struct Params: Encodable { let p_restaurant_id: String; let p_customer_id: String; let p_code: String }
        do {
            lastError = nil
            let rows: [NativeCounterCustomer] = try await client.rpc(
                "resolve_pairing_code_for_customer",
                params: Params(p_restaurant_id: restaurantId, p_customer_id: customer.id, p_code: code)
            ).execute().value
            guard let confirmed = rows.first, confirmed.id == customer.id else {
                lastError = "Le code ne correspond pas à ce client ou a expiré."
                return nil
            }
            return NativeCounterCustomer(
                id: confirmed.id,
                name: confirmed.name,
                phone: customer.phone,
                loyaltyPoints: confirmed.loyaltyPoints,
                visitCount: confirmed.visitCount,
                totalSpent: confirmed.totalSpent
            )
        } catch {
            lastError = "La confirmation d’identité a échoué. Demandez un nouveau code au client."
            print("confirmOwnerCustomerIdentity error: \(error)")
            return nil
        }
    }

    /// Records a counter visit through the existing atomic loyalty RPC. The
    /// database recalculates points from restaurant settings; the submitted
    /// points value is intentionally zero and ignored for authenticated users.
    func recordOwnerCustomerVisit(customer: NativeCounterCustomer, amountSpent: Double) async -> NativeOwnerCustomer? {
        guard isOwnerExperience,
              let restaurantId = selectedOwnerRestaurantId,
              ownerRestaurants.contains(where: { $0.id == restaurantId }),
              amountSpent.isFinite, amountSpent > 0, amountSpent <= 100_000 else {
            lastError = "Entrez un montant valide pour l’établissement sélectionné."
            return nil
        }
        struct Params: Encodable {
            let p_customer_id: String
            let p_restaurant_id: String
            let p_amount_spent: Double
            let p_points_delta: Int
            let p_note: String
            let p_via_pairing_code: Bool
            let p_via_pos_sync: Bool
            let p_via_phone_lookup: Bool
        }
        do {
            lastError = nil
            try await client.rpc(
                "increment_customer_visit",
                params: Params(
                    p_customer_id: customer.id,
                    p_restaurant_id: restaurantId,
                    p_amount_spent: amountSpent,
                    p_points_delta: 0,
                    p_note: "Visite comptoir — identité confirmée",
                    p_via_pairing_code: true,
                    p_via_pos_sync: false,
                    p_via_phone_lookup: true
                )
            ).execute()
            let updated: NativeOwnerCustomer = try await client.from("customers")
                .select("id, name, email, phone, loyalty_points, visit_count, total_spent")
                .eq("id", value: customer.id)
                .eq("restaurant_id", value: restaurantId)
                .single()
                .execute().value
            if let index = ownerCustomers.firstIndex(where: { $0.id == updated.id }) {
                ownerCustomers[index] = updated
            } else {
                ownerCustomers.insert(updated, at: 0)
            }
            return updated
        } catch {
            lastError = "La visite et les points n’ont pas pu être enregistrés. Réessayez."
            print("recordOwnerCustomerVisit error: \(error)")
            return nil
        }
    }

    func fetchMealSuggestions() async {
        guard let restaurantId = customer?.restaurantId else { return }
        struct Params: Encodable { let p_restaurant_id: String }
        do {
            customerMealSuggestions = try await client.rpc("get_meal_suggestions", params: Params(p_restaurant_id: restaurantId)).execute().value
        } catch {
            // The menu remains usable while an older environment is waiting
            // for the suggestion migration; expose no fake suggestions.
            customerMealSuggestions = []
            print("fetchMealSuggestions error: \(error)")
        }
    }

    func submitMealSuggestion(title: String, description: String?) async -> Bool {
        guard let restaurantId = customer?.restaurantId else { return false }
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (3...120).contains(cleanTitle.count) else { return false }
        let cleanDescription = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        struct Params: Encodable { let p_restaurant_id: String; let p_title: String; let p_description: String? }
        do {
            let _: UUID = try await client.rpc("submit_meal_suggestion", params: Params(
                p_restaurant_id: restaurantId,
                p_title: cleanTitle,
                p_description: cleanDescription?.isEmpty == false ? cleanDescription : nil
            )).execute().value
            await fetchMealSuggestions()
            return true
        } catch {
            lastError = "Votre suggestion n’a pas pu être envoyée. Réessayez."
            print("submitMealSuggestion error: \(error)")
            return false
        }
    }

    func voteForMealSuggestion(_ suggestion: NativeMealSuggestion) async -> Bool {
        guard suggestion.status == "open" else { return false }
        struct Params: Encodable { let p_suggestion_id: String }
        do {
            let result: [NativeMealSuggestionVoteResult] = try await client.rpc(
                "vote_meal_suggestion",
                params: Params(p_suggestion_id: suggestion.id)
            ).execute().value
            guard let updated = result.first else { return false }
            customerMealSuggestions = customerMealSuggestions.map { item in
                guard item.id == suggestion.id else { return item }
                return NativeMealSuggestion(
                    id: item.id, restaurantId: item.restaurantId, title: item.title,
                    description: item.description, status: item.status, menuItemId: item.menuItemId,
                    createdAt: item.createdAt, voteCount: updated.voteCount, hasVoted: updated.hasVoted
                )
            }
            return true
        } catch {
            lastError = "Votre vote n’a pas pu être enregistré. Réessayez."
            print("voteForMealSuggestion error: \(error)")
            return false
        }
    }

    private func fetchOwnerMealSuggestions(for restaurantId: String) async {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }) else { return }
        struct Params: Encodable { let p_restaurant_id: String }
        do {
            ownerMealSuggestions = try await client.rpc("get_meal_suggestions", params: Params(p_restaurant_id: restaurantId)).execute().value
        } catch {
            ownerMealSuggestions = []
            print("fetchOwnerMealSuggestions error: \(error)")
        }
    }

    func addMealSuggestionAsDraft(_ suggestion: NativeMealSuggestion) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId,
              ownerRestaurants.contains(where: { $0.id == restaurantId }),
              suggestion.restaurantId == restaurantId,
              ["open", "under_review"].contains(suggestion.status) else { return false }

        struct Params: Encodable { let p_suggestion_id: String }
        do {
            // The server RPC takes a row lock, validates owner/manager
            // membership, creates an unpublished menu draft and links it to
            // the suggestion in one transaction. It is idempotent, so an
            // interrupted request can safely be retried from `under_review`.
            let _: UUID = try await client.rpc(
                "create_menu_draft_from_suggestion",
                params: Params(p_suggestion_id: suggestion.id)
            ).execute().value
            await refreshOwnerOperations()
            return true
        } catch {
            lastError = "Le brouillon n’a pas pu être créé. Réessayez."
            print("addMealSuggestionAsDraft error: \(error)")
            return false
        }
    }

    func updateOwnerMenuItem(_ item: NativeMenuItem, name: String, price: Double, description: String?, active: Bool, allergens: [String], allergensConfirmed: Bool) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId, name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false, price >= 0 else { return false }
        if active && item.isDraft == true && (price <= 0 || !allergensConfirmed) { return false }
        struct Patch: Encodable {
            let name: String
            let price: Double
            let description: String?
            let active: Bool
            let isDraft: Bool
            let allergens: [String]
            let allergensConfirmed: Bool
            enum CodingKeys: String, CodingKey {
                case name, price, description, active, allergens
                case isDraft = "is_draft"
                case allergensConfirmed = "allergens_confirmed"
            }
        }
        do {
            try await client.from("menu_items").update(Patch(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                price: price,
                description: description?.trimmingCharacters(in: .whitespacesAndNewlines),
                active: active,
                isDraft: active ? false : (item.isDraft ?? false),
                allergens: allergens,
                allergensConfirmed: allergensConfirmed
            )).eq("restaurant_id", value: restaurantId).eq("id", value: item.id).execute()
            await refreshOwnerOperations()
            return true
        } catch { print("updateOwnerMenuItem error: \(error)"); return false }
    }

    func updateOwnerOrderStatus(_ orderId: String, restaurantId: String, status: String) async -> Bool {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }) else { return false }
        do {
            struct Patch: Encodable { let status: String }
            try await client.from("orders").update(Patch(status: status)).eq("restaurant_id", value: restaurantId).eq("id", value: orderId).execute()
            await refreshOwnerOperations()
            return true
        } catch { print("updateOwnerOrderStatus error: \(error)"); return false }
    }

    /// The native owner shell uses the same server-side delivery path as the
    /// web dashboard. The bearer token is verified again by the route before
    /// it can touch an order or invoke the service-role notification sender.
    func notifyOwnerOrder(_ orderId: String, restaurantId: String) async -> Bool {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }) else { return false }
        struct Body: Encodable { let restaurantId: String }
        struct Response: Decodable { let ok: Bool }
        do {
            let body = try JSONEncoder().encode(Body(restaurantId: restaurantId))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/native/owner/orders/\(orderId)/notify"),
                method: "POST",
                body: body
            )
            return try JSONDecoder().decode(Response.self, from: data).ok
        } catch {
            lastError = "La notification n'a pas pu être envoyée. Réessayez."
            print("notifyOwnerOrder error: \(error)")
            return false
        }
    }

    func updateOwnerReviewResponse(_ reviewId: String, response: String) async -> Bool {
        guard selectedOwnerRestaurantId != nil else { return false }
        let trimmed = response.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        struct Params: Encodable { let p_review_id: String; let p_response: String }
        do {
            let _: NativeOwnerRestaurantReview = try await client.rpc("respond_to_review", params: Params(p_review_id: reviewId, p_response: trimmed)).single().execute().value
            await refreshOwnerOperations()
            return true
        } catch { print("updateOwnerReviewResponse error: \(error)"); return false }
    }

    func updateOwnerEmployee(_ employee: NativeOwnerEmployee, fullName: String, roleTitle: String, hourlyWage: Double?, active: Bool) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId, !fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        struct Patch: Encodable { let fullName: String; let roleTitle: String; let hourlyWage: Double?; let active: Bool
            enum CodingKeys: String, CodingKey { case fullName = "full_name", roleTitle = "role_title", hourlyWage = "hourly_wage", active }
        }
        do {
            try await client.from("employees").update(Patch(fullName: fullName.trimmingCharacters(in: .whitespacesAndNewlines), roleTitle: roleTitle.trimmingCharacters(in: .whitespacesAndNewlines), hourlyWage: hourlyWage, active: active)).eq("restaurant_id", value: restaurantId).eq("id", value: employee.id).execute()
            await refreshOwnerOperations()
            return true
        } catch { print("updateOwnerEmployee error: \(error)"); return false }
    }

    func updateOwnerInventoryItem(_ item: NativeOwnerInventoryItem, quantity: Double, parLevel: Double, unitCost: Double) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId, quantity >= 0, parLevel >= 0, unitCost >= 0 else { return false }
        struct Patch: Encodable { let quantityOnHand: Double; let parLevel: Double; let unitCost: Double
            enum CodingKeys: String, CodingKey { case quantityOnHand = "quantity_on_hand", parLevel = "par_level", unitCost = "unit_cost" }
        }
        do {
            try await client.from("inventory_items").update(Patch(quantityOnHand: quantity, parLevel: parLevel, unitCost: unitCost)).eq("restaurant_id", value: restaurantId).eq("id", value: item.id).execute()
            await refreshOwnerOperations()
            return true
        } catch { print("updateOwnerInventoryItem error: \(error)"); return false }
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

        let prevTarget = tier == .ambassadeur ? loyaltyTier3Threshold : tier == .privilegie ? loyaltyTier2Threshold : 0
        let nextTarget: Double? = tier == .habitue ? loyaltyTier2Threshold : tier == .privilegie ? loyaltyTier3Threshold : nil
        let progress = nextTarget.map { min(1, max(0, (mine.totalSpent - prevTarget) / ($0 - prevTarget))) }

        let cheapestReward = rewards.min(by: { $0.pointsCost < $1.pointsCost })

        PointsSnapshot(
            customerName: mine.name,
            restaurantName: restaurantName ?? "Minerva Flow",
            points: mine.loyaltyPoints,
            tierLabel: tier.label,
            tierColorHex: tierHex,
            tierIsLight: tier == .ambassadeur,
            nextTierProgress: progress,
            nextRewardName: cheapestReward?.name,
            nextRewardPointsCost: cheapestReward?.pointsCost,
            activeOfferTitles: Array(offers.prefix(2).map(\.title)),
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

    // MARK: - Favorites

    /// Same customers_update_own RLS policy, direct table update — the heart
    /// toggle on a menu item (MenuView row, MenuItemDetailView) or offer
    /// (OfferDetailView), plus the removal action on FavoritesView. Reads
    /// the current array and writes the new one, matching the web portal's
    /// toggleFavorite (lib/data/customers.ts) exactly — a lost update from
    /// two rapid taps on the same favorite is low-stakes enough not to
    /// warrant an atomic RPC.
    func toggleFavoriteMenuItem(_ itemId: String, favorite: Bool) async -> Bool {
        guard let customerId = customer?.id else { return false }
        var ids = customer?.favoriteMenuItemIds ?? []
        if favorite {
            if !ids.contains(itemId) { ids.append(itemId) }
        } else {
            ids.removeAll { $0 == itemId }
        }
        do {
            struct Patch: Encodable { let favorite_menu_item_ids: [String] }
            try await client
                .from("customers")
                .update(Patch(favorite_menu_item_ids: ids))
                .eq("id", value: customerId)
                .execute()
            customer?.favoriteMenuItemIds = ids
            return true
        } catch {
            lastError = "La mise à jour de vos favoris a échoué. Réessayez."
            print("toggleFavoriteMenuItem error: \(error)")
            return false
        }
    }

    /// Structural copy of toggleFavoriteMenuItem, targeting offers instead.
    func toggleFavoriteOffer(_ offerId: String, favorite: Bool) async -> Bool {
        guard let customerId = customer?.id else { return false }
        var ids = customer?.favoriteOfferIds ?? []
        if favorite {
            if !ids.contains(offerId) { ids.append(offerId) }
        } else {
            ids.removeAll { $0 == offerId }
        }
        do {
            struct Patch: Encodable { let favorite_offer_ids: [String] }
            try await client
                .from("customers")
                .update(Patch(favorite_offer_ids: ids))
                .eq("id", value: customerId)
                .execute()
            customer?.favoriteOfferIds = ids
            return true
        } catch {
            lastError = "La mise à jour de vos favoris a échoué. Réessayez."
            print("toggleFavoriteOffer error: \(error)")
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

    /// Mints a fresh rotating code the customer shows staff to be looked up
    /// (and have a visit logged) without a QR-scan requirement — see
    /// mint_pairing_code in supabase/migrations/0086_pairing_codes.sql. A
    /// direct RPC, not the bridge API: this must keep working even if the
    /// www.minervaflow.app bridge is ever unreachable, since it's shown on
    /// every MyCardView appearance.
    func mintPairingCode() async {
        isMintingPairingCode = true
        pairingCodeError = nil
        defer { isMintingPairingCode = false }
        do {
            struct MintResult: Decodable {
                let code: String
                let expiresAt: Date
                enum CodingKeys: String, CodingKey { case code; case expiresAt = "expires_at" }
            }
            let result: MintResult = try await client
                .rpc("mint_pairing_code")
                .single()
                .execute()
                .value
            pairingCode = result.code
            pairingCodeExpiresAt = result.expiresAt
        } catch {
            pairingCode = nil
            pairingCodeExpiresAt = nil
            pairingCodeError = "Impossible de générer votre code. Réessayez."
            print("mintPairingCode error: \(error)")
        }
    }

    /// Self-serve join, for a restaurant the customer is only browsing
    /// (RestaurantDetailView) — previously a dead end, see
    /// join_restaurant_as_customer in
    /// supabase/migrations/0093_join_restaurant_as_customer.sql. Idempotent
    /// server-side, so calling this again for an existing membership is
    /// harmless. Only updates allMemberships, not the active
    /// customer/restaurant context — joining a second restaurant to browse
    /// shouldn't silently switch Home/Rewards away from the first one.
    func joinRestaurant(_ restaurantId: String) async -> Bool {
        do {
            struct JoinParams: Encodable { let p_restaurant_id: String }
            let _: Customer = try await client
                .rpc("join_restaurant_as_customer", params: JoinParams(p_restaurant_id: restaurantId))
                .single()
                .execute()
                .value
            await fetchAllMemberships()
            return true
        } catch {
            lastError = "Impossible de devenir client pour l'instant. Réessayez."
            print("joinRestaurant error: \(error)")
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

    /// Loi 25 self-serve data export, native equivalent of the web portal's
    /// exportMyDataAction — writes the returned JSON to a temp file (rather
    /// than returning raw Data) so the caller can hand it straight to a
    /// ShareLink, the same save/share mechanism already used everywhere
    /// else in the app instead of a bespoke file-picker flow.
    func exportMyData() async -> URL? {
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/export"))
            let filename = "minerva-flow-mes-donnees-\(Int(Date().timeIntervalSince1970)).json"
            let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
            try data.write(to: fileURL)
            return fileURL
        } catch {
            lastError = "L'export de vos données a échoué. Réessayez."
            print("exportMyData error: \(error)")
            return nil
        }
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
            let city: String?
            let timezone: String?
            let loyaltyTier2Threshold: Double
            let loyaltyTier3Threshold: Double
            let googleMapsUrl: String?
            let googlePlaceId: String?
            let isBusy: Bool?
        }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/restaurant"))
            let decoded = try JSONDecoder().decode(RestaurantInfoResponse.self, from: data)
            restaurantName = decoded.name
            restaurantCity = decoded.city
            if let identifier = decoded.timezone, let timezone = TimeZone(identifier: identifier) {
                restaurantTimezone = timezone
            }
            loyaltyTier2Threshold = decoded.loyaltyTier2Threshold
            loyaltyTier3Threshold = decoded.loyaltyTier3Threshold
            restaurantGoogleMapsUrl = decoded.googleMapsUrl
            restaurantGooglePlaceId = decoded.googlePlaceId
            restaurantIsBusy = decoded.isBusy ?? false
        } catch {
            print("fetchRestaurantInfo error: \(error)")
        }
    }

    /// "Mon restaurant · Repentigny" when both are known, just the name (or
    /// a safe fallback) otherwise — the one restaurant-identity string Home
    /// and Rewards both show next to a reward, so a customer belonging to
    /// more than one participating restaurant can tell which one a given
    /// reward is actually for.
    var restaurantIdentityLabel: String {
        let name = restaurantName ?? "ce restaurant"
        guard let city = restaurantCity, !city.trimmingCharacters(in: .whitespaces).isEmpty else { return name }
        return "\(name) · \(city)"
    }

    /// Every restaurant this account is a loyalty member of, plus combined
    /// points/rewards history across all of them — additive to the
    /// single-restaurant `customer`/`transactions`/`redemptions` above,
    /// which stay scoped to `mine` for Home/Commander/Rewards. The
    /// memberships list itself needs the bridge (restaurant names aren't
    /// customer-readable directly), but transactions/redemptions are
    /// fetched with no restaurant filter at all — RLS
    /// (loyalty_transactions_select_own) already scopes to every customer
    /// row this auth.uid() owns, across any restaurant, for free.
    func fetchAllMemberships() async {
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/restaurants"))
            let decoded = try JSONDecoder().decode(RestaurantMembershipsResponse.self, from: data)
            allMemberships = decoded.memberships
        } catch {
            print("fetchAllMemberships error: \(error)")
        }

        do {
            async let txsFetch: [LoyaltyTransaction] = client
                .from("loyalty_transactions")
                .select()
                .order("created_at", ascending: false)
                .limit(50)
                .execute()
                .value

            async let redemptionsFetch: [RewardRedemption] = client
                .from("reward_redemptions")
                .select()
                .order("created_at", ascending: false)
                .limit(50)
                .execute()
                .value

            (allTransactions, allRedemptions) = try await (txsFetch, redemptionsFetch)
        } catch {
            print("fetchAllMemberships (history) error: \(error)")
        }
    }

    /// The restaurant this account has visited the most — "membre fidèle"
    /// on the card names this one specifically rather than whichever
    /// restaurant happens to be currently loaded, since with more than one
    /// membership those aren't necessarily the same restaurant.
    var mostVisitedMembership: RestaurantMembership? {
        allMemberships.max(by: { $0.visitCount < $1.visitCount })
    }

    private func restaurantName(forId restaurantId: String) -> String? {
        allMemberships.first(where: { $0.restaurantId == restaurantId })?.restaurantName
    }

    /// Combined points/rewards history across every restaurant membership,
    /// each line naming its restaurant only when there's more than one to
    /// distinguish — a single-restaurant account's history reads exactly
    /// as it did before this existed.
    var combinedHistory: [LoyaltyHistoryEntry] {
        let showRestaurant = allMemberships.count > 1
        let fromTransactions = allTransactions.map { tx in
            LoyaltyHistoryEntry(
                id: "tx-\(tx.id)",
                title: historyLabel(forTransactionType: tx.type),
                date: tx.createdAt,
                pointsDelta: tx.pointsDelta,
                restaurantName: showRestaurant ? restaurantName(forId: tx.restaurantId) : nil
            )
        }
        let fromRedemptions = allRedemptions.map { redemption in
            LoyaltyHistoryEntry(
                id: "redeem-\(redemption.id)",
                title: "Récompense échangée : \(redemption.rewardName)",
                date: redemption.createdAt,
                pointsDelta: -redemption.pointsSpent,
                restaurantName: showRestaurant ? restaurantName(forId: redemption.restaurantId) : nil
            )
        }
        return (fromTransactions + fromRedemptions).sorted { $0.date > $1.date }
    }

    private func historyLabel(forTransactionType type: String) -> String {
        switch type {
        case "visite": return "Visite"
        case "ajustement": return "Ajustement"
        case "echange": return "Récompense échangée"
        default: return type
        }
    }

    func fetchMenu() async {
        isLoadingMenu = true
        defer { isLoadingMenu = false }
        isUsingDemoMenuFallback = false
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/menu"))
            let decoded = try JSONDecoder().decode(MenuResponse.self, from: data)
            menuItems = decoded.items.filter(\.active)
            taxRate = decoded.taxRate
            acceptsTips = decoded.acceptsTips
            onlinePaymentEnabled = decoded.onlinePaymentEnabled
            canPayAtReceipt = decoded.canPayAtReceipt ?? true
            canPayOnline = decoded.canPayOnline ?? decoded.onlinePaymentEnabled
            pickupEnabled = decoded.pickupEnabled ?? true
            deliveryEnabled = decoded.deliveryEnabled
            lastError = nil
        } catch let error as URLError where error.code == .notConnectedToInternet {
            applyDemoMenuFallback(message: "Connexion indisponible : le menu démo reste accessible hors ligne.")
        } catch {
            applyDemoMenuFallback(message: "Le menu en ligne n’a pas pu être chargé. Le menu démo est affiché pour continuer le test.")
            print("fetchMenu error: \(error)")
        }
    }

    private func applyDemoMenuFallback(message: String) {
        guard menuItems.isEmpty else {
            lastError = message
            return
        }
        menuItems = NativeMenuItem.demoCatalog
        taxRate = 0.14975
        acceptsTips = true
        onlinePaymentEnabled = false
        canPayAtReceipt = true
        canPayOnline = false
        pickupEnabled = true
        deliveryEnabled = false
        isUsingDemoMenuFallback = true
        lastError = message
    }

    /// Downloads the signed pass for the selected loyalty relationship. The
    /// request carries the current Supabase bearer token, so the server can
    /// scope the pass to the authenticated customer instead of trusting a
    /// client-provided identity.
    func downloadAppleWalletPass(customerId: String) async -> Data? {
        do {
            return try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/wallet/apple")
                    .appending(queryItems: [URLQueryItem(name: "customerId", value: customerId)])
            )
        } catch {
            lastError = "La carte Apple Wallet n’a pas pu être téléchargée. Réessayez."
            print("downloadAppleWalletPass error: \(error)")
            return nil
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

    struct OrderResult { let ok: Bool; let orderId: String?; let estimatedReadyAt: Date?; let paymentURL: URL? }
    struct DeliveryOrderInfo: Encodable { let address: String }

    func quoteDelivery(address: String) async -> PortalDeliveryQuote? {
        struct Request: Encodable { let address: String }
        struct Response: Decodable { let ok: Bool; let quote: PortalDeliveryQuote }
        do {
            let bodyData = try JSONEncoder().encode(Request(address: address))
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/delivery-quote"), method: "POST", body: bodyData)
            let response = try JSONDecoder().decode(Response.self, from: data)
            guard response.ok, response.quote.available else {
                lastError = response.quote.reason == "outside_radius"
                    ? "Cette adresse est au-delà de la zone de livraison du restaurant."
                    : "Impossible de calculer la livraison pour cette adresse."
                return nil
            }
            return response.quote
        } catch {
            lastError = "Le tarif de livraison n’a pas pu être calculé. Vérifiez l’adresse et réessayez."
            print("quoteDelivery error: \(error)")
            return nil
        }
    }

    /// estimatedReadyAt arrives as a raw ISO8601 string (the bridge routes
    /// never configure JSONDecoder's dateDecodingStrategy — only the direct
    /// Supabase client calls elsewhere get automatic Date decoding, via the
    /// SDK's own internal decoder), so this is parsed by hand rather than
    /// declared as `Date?` on OrderResponse directly.
    func submitOrder(cart: [String: Int], tipAmount: Double, paymentMethod: String?, requestedReadyAt: Date? = nil, payOnline: Bool = false, delivery: DeliveryOrderInfo? = nil) async -> OrderResult {
        struct CartLine: Encodable { let menuItemId: String; let quantity: Int }
        struct OrderBody: Encodable { let cart: [CartLine]; let tipAmount: Double; let paymentMethod: String?; let payOnline: Bool; let delivery: DeliveryOrderInfo?; let requestedReadyAtLocal: String? }
        struct OrderResponse: Decodable { let ok: Bool; let orderId: String?; let estimatedReadyAt: String?; let paymentUrl: String? }

        let lines = cart.compactMap { key, qty -> CartLine? in
            qty > 0 ? CartLine(menuItemId: key, quantity: qty) : nil
        }
        guard !lines.isEmpty else { return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil) }
        guard !payOnline || onlinePaymentEnabled else { return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil) }

        do {
            let dateFormatter = ISO8601DateFormatter()
            let bodyData = try JSONEncoder().encode(OrderBody(
                cart: lines,
                tipAmount: tipAmount,
                paymentMethod: paymentMethod,
                payOnline: payOnline,
                delivery: delivery,
                requestedReadyAtLocal: requestedReadyAt.map(dateFormatter.string(from:))
            ))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/portal/orders"),
                method: "POST",
                body: bodyData
            )
            let decoded = try JSONDecoder().decode(OrderResponse.self, from: data)
            let eta = decoded.estimatedReadyAt.flatMap { ISO8601DateFormatter().date(from: $0) }
            return OrderResult(ok: decoded.ok, orderId: decoded.orderId, estimatedReadyAt: eta, paymentURL: decoded.paymentUrl.flatMap(URL.init(string:)))
        } catch let error as URLError where error.code == .notConnectedToInternet {
            lastError = "Aucune connexion internet. Votre commande n'a pas été envoyée."
            return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil)
        } catch {
            lastError = "La commande a échoué. Réessayez."
            print("submitOrder error: \(error)")
            return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil)
        }
    }

    /// Survey responses are delivered by email only (no dedicated table) —
    /// see app/api/portal/survey/route.ts. Returns whether the send
    /// succeeded so SurveyView can show a real error instead of a false
    /// "merci" on failure.
    func submitSurvey(rating: Int, comment: String?) async -> Bool {
        struct Body: Encodable { let rating: Int; let comment: String? }
        struct Response: Decodable { let ok: Bool }
        do {
            let bodyData = try JSONEncoder().encode(Body(rating: rating, comment: comment?.isEmpty == false ? comment : nil))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/portal/survey"),
                method: "POST",
                body: bodyData
            )
            return try JSONDecoder().decode(Response.self, from: data).ok
        } catch {
            print("submitSurvey error: \(error)")
            return false
        }
    }

    // MARK: - Restaurant discovery (map)

    @Published var nearbyRestaurants: [DiscoverRestaurant] = []
    @Published var isLoadingDiscover = false
    @Published var popularNearby: [PopularMenuItem] = []

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
            lastError = nil
        } catch {
            lastError = "Impossible de charger les restaurants à proximité."
            print("fetchNearbyRestaurants error: \(error)")
        }
    }

    func fetchPopularNearby() async {
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/popular"))
            popularNearby = try JSONDecoder().decode(PopularMenuItemsResponse.self, from: data).items
        } catch {
            print("fetchPopularNearby error: \(error)")
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
    func submitReview(menuItemId: String, restaurantId: String, rating: Int, comment: String?, imageUrls: [String] = []) async -> Bool {
        guard let customerId = customer?.id else { return false }
        do {
            struct NewReview: Encodable {
                let menu_item_id: String
                let restaurant_id: String
                let customer_id: String
                let rating: Int
                let comment: String?
                let image_urls: [String]
            }
            try await client
                .from("menu_item_reviews")
                .upsert(
                    NewReview(menu_item_id: menuItemId, restaurant_id: restaurantId, customer_id: customerId, rating: rating, comment: comment, image_urls: Array(imageUrls.prefix(6))),
                    onConflict: "menu_item_id,customer_id"
                )
                .execute()
            return true
        } catch {
            lastError = "L'envoi de votre avis a échoué. Réessayez."
            print("submitReview error: \(error)")
            return false
        }
    }

    // MARK: - Restaurant-level reviews

    func fetchRestaurantReviews(restaurantId: String) async -> [RestaurantReview] {
        do {
            let reviews: [RestaurantReview] = try await client
                .from("restaurant_reviews")
                .select()
                .eq("restaurant_id", value: restaurantId)
                .order("created_at", ascending: false)
                .execute()
                .value
            return reviews
        } catch {
            print("fetchRestaurantReviews error: \(error)")
            return []
        }
    }

    /// Uploads to the "review-images" bucket under this user's own folder
    /// (review_images_owner_write RLS), returning the public URL — mirrors
    /// uploadAvatar's pattern. Called once per photo before the review
    /// itself is submitted, since the review row just stores URLs.
    func uploadReviewImage(_ imageData: Data) async -> String? {
        do {
            guard let userId = try? await client.auth.session.user.id else { return nil }
            let path = "\(userId)/review-\(UUID().uuidString).jpg"
            try await client.storage.from("review-images").upload(
                path,
                data: imageData,
                options: FileOptions(contentType: "image/jpeg")
            )
            return try client.storage.from("review-images").getPublicURL(path: path).absoluteString
        } catch {
            print("uploadReviewImage error: \(error)")
            return nil
        }
    }

    /// restaurant_reviews_customer_insert requires the caller to actually
    /// be a loyalty customer of this specific restaurant, same RLS
    /// pattern as the per-dish reviews.
    func submitRestaurantReview(restaurantId: String, rating: Int, comment: String?, imageUrls: [String]) async -> Bool {
        guard let customerId = customer?.id else { return false }
        do {
            struct NewReview: Encodable {
                let restaurant_id: String
                let customer_id: String
                let rating: Int
                let comment: String?
                let image_urls: [String]
            }
            try await client
                .from("restaurant_reviews")
                .upsert(
                    NewReview(restaurant_id: restaurantId, customer_id: customerId, rating: rating, comment: comment, image_urls: Array(imageUrls.prefix(6))),
                    onConflict: "restaurant_id,customer_id"
                )
                .execute()
            return true
        } catch {
            lastError = "L'envoi de votre avis a échoué. Réessayez."
            print("submitRestaurantReview error: \(error)")
            return false
        }
    }

    // MARK: - Offer reviews (structural copy of the menu-item review pair above)

    func fetchOfferReviews(offerId: String) async -> [OfferReview] {
        do {
            let reviews: [OfferReview] = try await client
                .from("offer_reviews")
                .select()
                .eq("offer_id", value: offerId)
                .order("created_at", ascending: false)
                .execute()
                .value
            return reviews
        } catch {
            print("fetchOfferReviews error: \(error)")
            return []
        }
    }

    /// offer_reviews_customer_insert requires the caller to actually be a
    /// loyalty customer of that specific restaurant, same trust boundary
    /// as submitReview(forMenuItem:).
    func submitOfferReview(offerId: String, restaurantId: String, rating: Int, comment: String?, imageUrls: [String] = []) async -> Bool {
        guard let customerId = customer?.id else { return false }
        do {
            struct NewReview: Encodable {
                let offer_id: String
                let restaurant_id: String
                let customer_id: String
                let rating: Int
                let comment: String?
                let image_urls: [String]
            }
            try await client
                .from("offer_reviews")
                .upsert(
                    NewReview(offer_id: offerId, restaurant_id: restaurantId, customer_id: customerId, rating: rating, comment: comment, image_urls: Array(imageUrls.prefix(6))),
                    onConflict: "offer_id,customer_id"
                )
                .execute()
            return true
        } catch {
            lastError = "L'envoi de votre avis a échoué. Réessayez."
            print("submitOfferReview error: \(error)")
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

    // MARK: - In-App Surveys & Announcements

    func submitAnnouncementVote(announcementId: String, option: String, feedback: String? = nil) async {
        struct SurveyInsert: Encodable {
            let announcement_id: String
            let customer_id: String?
            let selected_option: String
            let feedback_text: String?
            let platform: String
        }
        let payload = SurveyInsert(
            announcement_id: announcementId,
            customer_id: customer?.id,
            selected_option: option,
            feedback_text: feedback,
            platform: "ios"
        )
        do {
            try await client
                .from("platform_survey_responses")
                .insert(payload)
                .execute()
        } catch {
            print("submitAnnouncementVote error: \(error)")
        }
    }
}

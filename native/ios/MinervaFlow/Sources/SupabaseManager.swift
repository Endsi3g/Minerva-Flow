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
    @Published private(set) var realtimeStatus = "idle"
    @Published private(set) var realtimeLastUpdate: Date?
    @Published private(set) var authUserID: UUID?
    @Published var customer: Customer?
    @Published private(set) var activeTenantBranding: NativeTenantBranding?
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
    @Published var restaurantPhone: String?
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
    @Published var isLoadingCustomerMealSuggestions = false
    @Published var customerMealSuggestionsError: String?
    @Published var customerServiceQuotes: [NativeServiceQuote] = []
    @Published var isLoadingCustomerServiceQuotes = false
    @Published var customerServiceQuotesError: String?
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
    /// Every customer row of the account (one per establishment), oldest first.
    @Published var allCustomers: [Customer] = []
    /// One-time install-bonus credits received this session (shown once on Home).
    @Published var appBonusAwards: [AppBonusAward] = []
    private var hasClaimedAppBonusThisSession = false
    @Published var allTransactions: [LoyaltyTransaction] = []
    @Published var allRedemptions: [RewardRedemption] = []
    @Published var isLoadingHistory = false
    @Published var historyError: String?
    @Published var myOrders: [CustomerOrder] = []
    @Published var isLoadingOrders = false
    @Published var ordersLoadFailed = false
    @Published var isLoadingData = false
    @Published var isLoadingMenu = false
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
    @Published var isManagingRestaurant = false
    @Published var isLoadingOwnerOperations = false
    @Published var requestedOwnerAccess = false
    /// Mirrors the web /equipe gate (lib/data/team-portal.ts): a distinct
    /// account type from owner/customer, checked first in loadPortalData so
    /// a team/ambassador account never falls into restaurant resolution.
    @Published var isTeamExperience = false
    @Published var isTeamMember = false
    @Published var teamMetrics: NativeTeamMetrics?
    @Published var isLoadingTeamMetrics = false
    @Published var teamMetricsError: String?
    @Published var academyPages: [NativeAcademyPage] = []
    @Published var teamGoals: NativeTeamGoals?
    @Published var isLoadingAcademy = false
    @Published var isLoadingTeamGoals = false
    @Published var memberDirectory: [NativeMemberSummary] = []
    @Published var memberDirectoryUserId: String?
    @Published var isLoadingMembers = false
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

    private var experienceLoadTask: Task<Void, Never>?

    private func isCurrentSession(_ userID: UUID) -> Bool {
        !Task.isCancelled && isAuthenticated && authUserID == userID && client.auth.currentUser?.id == userID
    }

    private func clearAccountData() {
        isLoadingOwnerOperations = false
        isManagingRestaurant = false
        isOwnerExperience = false
        isTeamExperience = false
        isTeamMember = false
        customer = nil
        allCustomers = []; allMemberships = []; allTransactions = []; allRedemptions = []
        transactions = []; rewards = []; redemptions = []; offers = []; announcements = []
        birthdayOffer = nil; myOrders = []; menuItems = []; referralPrograms = []
        appBonusAwards = []; hasClaimedAppBonusThisSession = false
        customerMealSuggestions = []; customerServiceQuotes = []
        restaurantName = nil; restaurantCity = nil; restaurantPhone = nil
        restaurantGoogleMapsUrl = nil; restaurantGooglePlaceId = nil
        pairingCode = nil; pairingCodeExpiresAt = nil
        ownerRestaurants = []; selectedOwnerRestaurantId = nil; ownerBranding = nil
        ownerMetrics = NativeOwnerMetrics(); ownerOrders = []; ownerMenuItems = []
        ownerOffers = []; ownerRewards = []; ownerCustomers = []; ownerEmployees = []
        ownerInventoryItems = []; ownerTransactions = []; ownerReviews = []; ownerMealSuggestions = []
        teamMetrics = nil; teamGoals = nil; academyPages = []; memberDirectory = []; memberDirectoryUserId = nil
        lastError = nil
        activateTenantBranding(nil)
    }

    private func observeAuthState() async {
        for await state in client.auth.authStateChanges {
            AppLog.diagnostic("auth event \(state.event) session=\(state.session != nil) host=\(Config.supabaseURL.host ?? "none")")
            if state.event == .signedIn || state.event == .initialSession {
                // A late initial-session event must not overwrite a newer login.
                guard let session = state.session else {
                    if client.auth.currentUser == nil {
                        experienceLoadTask?.cancel()
                        clearAccountData()
                        authUserID = nil; isAuthenticated = false; isResolvingExperience = false
                    }
                    continue
                }
                guard client.auth.currentUser?.id == session.user.id else {
                    if state.event == .signedIn && client.auth.currentUser == nil {
                        lastError = "La session sécurisée n’a pas pu être enregistrée. Réessayez de vous connecter."
                    }
                    continue
                }
                experienceLoadTask?.cancel()
                if authUserID != session.user.id { clearAccountData() }
                isResolvingExperience = true
                experienceResolutionError = nil
                authUserID = session.user.id
                isAuthenticated = true
                let userID = session.user.id
                // Keep consuming auth events while requests are in flight.
                // Sign-out/account changes cancel obsolete loads immediately.
                experienceLoadTask = Task { @MainActor [weak self] in
                    guard let self else { return }
                    let watchdog = Task { @MainActor [weak self] in
                        try? await Task.sleep(nanoseconds: 15_000_000_000)
                        guard let self, self.isCurrentSession(userID), !Task.isCancelled else { return }
                        self.isResolvingExperience = false
                        self.experienceResolutionError = "La préparation de votre espace prend trop de temps. Vérifiez votre connexion, puis réessayez."
                    }
                    await self.loadPortalData()
                    watchdog.cancel()
                    guard self.isCurrentSession(userID) else { return }
                    self.experienceResolutionError = nil
                    self.isResolvingExperience = false
                    Analytics.identify(userID: userID, role: self.isTeamExperience ? "team" : (self.isOwnerExperience ? "owner" : "client"))
                    // Realtime/push setup does not block opening the workspace.
                    await self.configureRealtimeSubscriptions()
                    guard self.isCurrentSession(userID) else { return }
                    await self.registerStoredPushToken()
                }
            } else if state.event == .signedOut {
                // Ignore a delayed sign-out if Auth already holds a new session.
                guard client.auth.currentUser == nil else { continue }
                experienceLoadTask?.cancel()
                clearAccountData()
                requestedOwnerAccess = false
                isAuthenticated = false; authUserID = nil
                isResolvingExperience = false; experienceResolutionError = nil
                realtimeStatus = "idle"
                Analytics.reset()
                await stopRealtimeSubscriptions()
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
        // Email verification accepts both signup and returning-user OTPs.
        try await client.auth.verifyOTP(email: email, token: code, type: .email)
    }

    func signOut() async {
        DeepLinkRouter.shared.pendingReorderCart = nil
        DeepLinkRouter.shared.pendingReorderRestaurantId = nil
        DeepLinkRouter.shared.pendingReorderCustomerId = nil
        if let userID = authUserID, let token = UserDefaults.standard.string(forKey: "minervaAPNsDeviceToken") {
            _ = try? await client.from("device_push_tokens").delete()
                .eq("user_id", value: userID)
                .eq("token", value: token)
                .execute()
        }
        await stopRealtimeSubscriptions()
        try? await client.auth.signOut()
    }

    private var realtimeChannel: RealtimeChannelV2?
    private var realtimeSubscriptions: [RealtimeSubscription] = []
    private var realtimeTenantKey: String?
    private var realtimeRefreshTask: Task<Void, Never>?
    private var realtimeStatusTask: Task<Void, Never>?

    /// Opens one RLS-scoped channel for the authenticated customer's current
    /// restaurant, or all restaurants the owner/manager belongs to.
    private func configureRealtimeSubscriptions(force: Bool = false) async {
        guard isAuthenticated, let userID = authUserID else {
            await stopRealtimeSubscriptions()
            return
        }
        let restaurantIDs = isManagingRestaurant
            ? ownerRestaurants.map(\.id).sorted()
            : [customer?.restaurantId].compactMap { $0 }
        guard !restaurantIDs.isEmpty else { return }
        let tenantKey = "\(userID.uuidString):\(restaurantIDs.joined(separator: ",")):owner=\(isManagingRestaurant)"
        guard force || tenantKey != realtimeTenantKey else { return }

        await stopRealtimeSubscriptions()
        realtimeTenantKey = tenantKey
        realtimeStatus = "connecting"

        let channel = client.channel("app-live-\(userID.uuidString.lowercased())")
        let restaurantFilter: RealtimePostgresFilter = restaurantIDs.count == 1
            ? .eq("restaurant_id", value: restaurantIDs[0])
            : .in("restaurant_id", values: restaurantIDs)
        let refreshTables = [
            "activity_log", "alerts", "campaigns", "customers", "employees",
            "financial_transactions", "inventory_items", "inventory_low_stock_state",
            "loyalty_rewards", "loyalty_transactions",
            "menu_items", "notifications", "offers", "order_status_events", "orders",
            "purchase_orders", "reservation_status_events", "reservations",
            "restaurant_members", "revenue_programs", "reward_redemptions", "service_days",
            "shift_schedules", "suppliers", "team_chat_messages"
        ]

        for table in refreshTables {
            realtimeSubscriptions.append(channel.onPostgresChange(InsertAction.self, schema: "public", table: table, filter: restaurantFilter) { [weak self] _ in
                Task { @MainActor [weak self] in self?.scheduleRealtimeRefresh() }
            })
            realtimeSubscriptions.append(channel.onPostgresChange(UpdateAction.self, schema: "public", table: table, filter: restaurantFilter) { [weak self] _ in
                Task { @MainActor [weak self] in self?.scheduleRealtimeRefresh() }
            })
        }

        // Customer-owned events have finer row filters. These are additive
        // and remain constrained by each table's own RLS policy.
        if !isManagingRestaurant, let customerID = customer?.id {
            for table in ["loyalty_transactions", "reward_redemptions"] {
                realtimeSubscriptions.append(channel.onPostgresChange(InsertAction.self, schema: "public", table: table, filter: .eq("customer_id", value: customerID)) { [weak self] _ in
                    Task { @MainActor [weak self] in self?.scheduleRealtimeRefresh() }
                })
            }
            for event in ["INSERT", "UPDATE"] {
                if event == "INSERT" {
                    realtimeSubscriptions.append(channel.onPostgresChange(InsertAction.self, schema: "public", table: "orders", filter: .eq("customer_id", value: customerID)) { [weak self] _ in
                        Task { @MainActor [weak self] in self?.scheduleRealtimeRefresh() }
                    })
                } else {
                    realtimeSubscriptions.append(channel.onPostgresChange(UpdateAction.self, schema: "public", table: "orders", filter: .eq("customer_id", value: customerID)) { [weak self] _ in
                        Task { @MainActor [weak self] in self?.scheduleRealtimeRefresh() }
                    })
                }
            }
        }

        realtimeChannel = channel
        realtimeStatusTask = Task { @MainActor [weak self] in
            for await status in channel.statusChange {
                guard let self, !Task.isCancelled else { return }
                switch status {
                case .subscribed: self.realtimeStatus = "live"
                case .subscribing: self.realtimeStatus = "connecting"
                case .unsubscribed: self.realtimeStatus = "reconnecting"
                case .unsubscribing: self.realtimeStatus = "reconnecting"
                }
            }
        }
        do {
            try await channel.subscribeWithError()
            realtimeStatus = "live"
            realtimeLastUpdate = Date()
        } catch {
            realtimeStatus = "reconnecting"
            AppLog.failure("Realtime subscribe", error)
        }
    }

    private func scheduleRealtimeRefresh() {
        realtimeLastUpdate = Date()
        realtimeRefreshTask?.cancel()
        realtimeRefreshTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 500_000_000)
            guard !Task.isCancelled, let self else { return }
            await self.loadPortalData()
        }
    }

    private func stopRealtimeSubscriptions() async {
        realtimeRefreshTask?.cancel()
        realtimeRefreshTask = nil
        realtimeStatusTask?.cancel()
        realtimeStatusTask = nil
        realtimeSubscriptions.removeAll()
        if let realtimeChannel {
            await client.removeChannel(realtimeChannel)
            self.realtimeChannel = nil
        }
        realtimeTenantKey = nil
    }

    func pauseRealtimeForBackground() async {
        realtimeStatus = "idle"
        await stopRealtimeSubscriptions()
    }

    func resumeRealtimeFromForeground() async {
        guard isAuthenticated else { return }
        realtimeStatus = "connecting"
        await loadPortalData()
        await configureRealtimeSubscriptions(force: true)
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
        guard !Config.devTestEmail.isEmpty, !Config.devTestPassword.isEmpty else { throw URLError(.userAuthenticationRequired) }
        try await client.auth.signIn(email: Config.devTestEmail, password: Config.devTestPassword)
        AppLog.diagnostic("UI test login completed")
    }
    #endif

    /// Loads the same data surface the web portal's Home tab shows for the
    /// current session's own customer row(s) — RLS (customers_select_own)
    /// is the actual trust boundary, this just picks the first restaurant
    /// relationship rather than offering the multi-restaurant chooser the
    /// web portal has (fine for Phase 1 — most loyalty customers belong to
    /// exactly one restaurant).
    /// Cross-tenant, so it goes through /api/team/metrics (verifies
    /// is_team_member server-side) rather than a direct RLS-scoped query.
    func loadTeamMetrics() async {
        guard isTeamMember else { return }
        isLoadingTeamMetrics = true
        teamMetricsError = nil
        defer { isLoadingTeamMetrics = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/team/metrics"))
            teamMetrics = try JSONDecoder().decode(NativeTeamMetrics.self, from: data)
        } catch {
            teamMetricsError = "Impossible de charger les indicateurs. Réessayez."
            AppLog.failure("loadTeamMetrics", error)
        }
    }

    /// Same content as web /equipe/academie; the server strips team-only
    /// sections for ambassadors, so nothing is filtered client-side.
    func loadTeamAcademy() async {
        isLoadingAcademy = true
        defer { isLoadingAcademy = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/team/academy"))
            academyPages = try JSONDecoder().decode(NativeAcademyResponse.self, from: data).pages
        } catch {
            AppLog.failure("loadTeamAcademy", error)
        }
    }

    /// Active touchpoints of the selected restaurant, via the owner's own RLS
    /// session (physical_touchpoints_manage_select: owner/manager only).
    func loadOwnerTouchpoints() async -> [NativeOwnerTouchpoint] {
        guard let restaurantId = selectedOwnerRestaurantId else { return [] }
        do {
            return try await client
                .from("physical_touchpoints")
                .select("id, label, type, code, destination_kind")
                .eq("restaurant_id", value: restaurantId)
                .eq("is_active", value: true)
                .order("created_at", ascending: false)
                .execute()
                .value
        } catch {
            AppLog.failure("loadOwnerTouchpoints", error)
            return []
        }
    }

    func loadMemberDirectory() async {
        guard isTeamMember else { return }
        isLoadingMembers = true
        defer { isLoadingMembers = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/team/members"))
            let decoded = try JSONDecoder().decode(NativeMemberDirectory.self, from: data)
            memberDirectory = decoded.members
            memberDirectoryUserId = decoded.currentUserId
        } catch {
            AppLog.failure("loadMemberDirectory", error)
        }
    }

    /// `id` may be "me". Employees can open any employee; ambassadors only themselves.
    func loadMemberProfile(id: String) async -> NativeMemberProfile? {
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/team/members/\(id)"))
            return try JSONDecoder().decode(NativeMemberProfile.self, from: data)
        } catch {
            AppLog.failure("loadMemberProfile", error)
            return nil
        }
    }

    /// Writes to the caller's own profile. Returns nil on success, otherwise a
    /// message safe to show (the server's own validation text when it sent one).
    func updateTeamProfile(_ payload: [String: String]) async -> String? {
        guard let token = await bearerToken(),
              let body = try? JSONSerialization.data(withJSONObject: payload) else {
            return "Session expirée. Reconnectez-vous."
        }
        var request = URLRequest(url: Config.apiBaseURL.appending(path: "/api/team/profile"), timeoutInterval: 15)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let restaurantId = customer?.restaurantId { request.setValue(restaurantId, forHTTPHeaderField: "x-restaurant-id") }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { return "Échec de l'enregistrement." }
            if (200..<300).contains(http.statusCode) { return nil }
            struct ErrorBody: Decodable { let error: String }
            return (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error ?? "Échec de l'enregistrement."
        } catch {
            AppLog.failure("updateTeamProfile", error)
            return "Connexion impossible. Réessayez."
        }
    }

    func loadTeamGoals() async {
        guard isTeamMember else { return }
        isLoadingTeamGoals = true
        defer { isLoadingTeamGoals = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/team/goals"))
            teamGoals = try JSONDecoder().decode(NativeTeamGoals.self, from: data)
        } catch {
            AppLog.failure("loadTeamGoals", error)
        }
    }

    func saveTeamGoal(metric: String, target: Double) async -> Bool {
        guard isTeamMember else { return false }
        struct Payload: Encodable { let metric: String; let target: Double }
        do {
            let body = try JSONEncoder().encode(Payload(metric: metric, target: target))
            _ = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/team/goals"), method: "POST", body: body)
            await loadTeamGoals()
            return true
        } catch {
            AppLog.failure("saveTeamGoal", error)
            return false
        }
    }

    /// Checked before loadOwnerContext — team/ambassador is a distinct
    /// account type, never a restaurant membership. Mirrors
    /// lib/data/team-portal.ts's getTeamPortalAccess exactly (team member
    /// OR active flow_ambassadors row).
    private func loadTeamPortalContext() async {
        guard let userId = authUserID else { isTeamExperience = false; return }
        struct ProfileFlag: Decodable { let isTeamMember: Bool
            enum CodingKeys: String, CodingKey { case isTeamMember = "is_team_member" }
        }
        do {
            async let profile: [ProfileFlag] = client.from("profiles").select("is_team_member").eq("id", value: userId.uuidString).execute().value
            async let ambassador: [NativeFlowAmbassadorFlag] = client.from("flow_ambassadors").select("id").eq("user_id", value: userId.uuidString).eq("status", value: "active").execute().value
            let isTeam = try await profile.first?.isTeamMember ?? false
            let isAmbassador = try await !ambassador.isEmpty
            guard isCurrentSession(userId) else { return }
            isTeamMember = isTeam
            isTeamExperience = isTeam || isAmbassador
        } catch {
            guard isCurrentSession(userId) else { return }
            isTeamExperience = false
            AppLog.failure("loadTeamPortalContext", error)
        }
    }

    func loadPortalData() async {
        guard let userID = authUserID, isCurrentSession(userID) else { return }
        isLoadingData = true
        birthdayOffer = nil
        defer { isLoadingData = false }
        do {
            await loadTeamPortalContext()
            guard isCurrentSession(userID) else { return }
            if isTeamExperience {
                return
            }
            await loadOwnerContext(includeOperations: isManagingRestaurant || requestedOwnerAccess)
            guard isCurrentSession(userID) else { return }
            if requestedOwnerAccess {
                isManagingRestaurant = isOwnerExperience
                requestedOwnerAccess = false
                if !isOwnerExperience { lastError = "Ce compte n’a pas d’accès propriétaire actif." }
            } else if isOwnerExperience && !prefersCustomerWorkspace(userID) {
                // An account with an active owner/manager role opens its
                // restaurant workspace by default. The customer space stays one
                // tap away (Compte › Espace client) and is remembered per account.
                isManagingRestaurant = true
            }
            if !isOwnerExperience { isManagingRestaurant = false }
            if isManagingRestaurant && isOwnerExperience {
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
                .eq("user_id", value: authUserID?.uuidString ?? "00000000-0000-0000-0000-000000000000")
                .order("created_at", ascending: true)
                .execute()
                .value
            AppLog.diagnostic("customer query rows=\(customers.count) sessionMatches=\(client.auth.currentUser?.id == authUserID)")
            guard isCurrentSession(userID) else { return }
            allCustomers = customers
            let selectedId = authUserID.flatMap { UserDefaults.standard.string(forKey: "activeCustomerRestaurant:\($0.uuidString)") }
            guard let mine = customers.first(where: { $0.restaurantId == selectedId }) ?? customers.first else {
                customer = nil
                activateTenantBranding(nil)
                return
            }
            customer = mine
            if let userId = authUserID { UserDefaults.standard.set(mine.restaurantId, forKey: "activeCustomerRestaurant:\(userId.uuidString)") }
            await fetchTenantBranding(for: mine.restaurantId)
            guard isCurrentSession(userID) else { return }
            await claimAppInstallBonusIfNeeded()
            guard isCurrentSession(userID) else { return }

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
            guard isCurrentSession(userID), customer?.id == mine.id else { return }
            transactions = txs
            rewards = rewardsResult
            let liveOffers = offersResult.filter { $0.isLive }
            birthdayOffer = liveOffers.first(where: \.isBirthdaySpecial)
            offers = liveOffers.filter { !$0.isBirthdaySpecial }
            redemptions = redemptionsResult
            announcements = announcementsResult
            lastError = nil
            await fetchRestaurantInfo()
            guard isCurrentSession(userID), customer?.id == mine.id else { return }
            saveWidgetSnapshot(for: mine)
            await fetchAllMemberships()
        } catch {
            guard isCurrentSession(userID) else { return }
            // Loading is best-effort here: a transient network blip shouldn't
            // wipe out whatever the last successful load already put on
            // screen (pull-to-refresh keeps showing stale-but-real data
            // instead of blanking out), but it's still surfaced so the user
            // knows a refresh silently failed rather than assuming it's current.
            lastError = "La mise à jour a échoué. Vérifiez votre connexion et réessayez."
            AppLog.failure("loadPortalData", error)
        }
    }

    func retryExperienceResolution() async {
        guard let userId = authUserID, isCurrentSession(userId) else { return }
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
        guard isCurrentSession(userId) else { return }
        experienceResolutionError = nil
        isResolvingExperience = false
    }

    /// Reads the platform-wide release history. The changelog table's
    /// authenticated SELECT policy is the access boundary; no restaurant
    /// data or privileged client is involved.
    /// `audience` is "owner" or "client"; entries marked "all" are always included.
    func fetchNativeChangelog(audience: String) async throws -> [NativeChangelogEntry] {
        try await client
            .from("changelog_entries")
            .select("id, title, description, category, published_at")
            .in("audience", values: [audience, "all"])
            .order("published_at", ascending: false)
            .limit(100)
            .execute()
            .value
    }

    /// Loads only the owner surface needed by the native shell. RLS policies
    /// on `restaurant_members` and `workspace_brand_settings` remain the
    /// authority; this query does not trust role data supplied by the app.
    private func loadOwnerContext(includeOperations: Bool = false) async {
        guard let userId = authUserID, isCurrentSession(userId) else { return }
        struct Membership: Decodable {
            let role: String
            let restaurantId: String
            let restaurant: NativeOwnerRestaurant?
            enum CodingKeys: String, CodingKey { case role, restaurantId = "restaurant_id", restaurant = "restaurants" }
        }
        do {
            guard let userId = authUserID else {
                isOwnerExperience = false
                isManagingRestaurant = false
                selectedOwnerRestaurantId = nil
                ownerRestaurants = []
                return
            }
            let memberships: [Membership] = try await client
                .from("restaurant_members")
                .select("role, restaurant_id, restaurants(id, name, city, workspace_id)")
                .eq("user_id", value: userId.uuidString)
                .eq("status", value: "active")
                .execute()
                .value
            guard isCurrentSession(userId) else { return }
            AppLog.diagnostic("own memberships=\(memberships.count)")
            let privileged = memberships.filter { $0.role == "owner" || $0.role == "manager" }
            guard let first = privileged.first else {
                isOwnerExperience = false
                isManagingRestaurant = false
                selectedOwnerRestaurantId = nil
                ownerRestaurants = []
                ownerBranding = nil
                ownerMetrics = NativeOwnerMetrics()
                return
            }
            isOwnerExperience = true
            ownerRestaurants = privileged.compactMap(\.restaurant)
            if selectedOwnerRestaurantId == nil || !ownerRestaurants.contains(where: { $0.id == selectedOwnerRestaurantId }) {
                let remembered = UserDefaults.standard.string(forKey: "selectedOwnerRestaurant.\(userId.uuidString)")
                selectedOwnerRestaurantId = ownerRestaurants.first(where: { $0.id == remembered })?.id ?? first.restaurantId
            }
            if includeOperations {
                async let metrics: Void = loadOwnerMetrics()
                async let orders: Void = loadOwnerOrders()
                async let operations: Void = loadOwnerOperations(for: selectedOwnerRestaurantId ?? first.restaurantId)
                async let ideas: Void = fetchOwnerMealSuggestions(for: selectedOwnerRestaurantId ?? first.restaurantId)
                async let branding: Void = loadSelectedOwnerBranding()
                _ = await (metrics, orders, operations, ideas, branding)
            }
        } catch {
            guard isCurrentSession(userId) else { return }
            // A customer session can legitimately receive no membership rows;
            // only surface errors for a session that looked privileged.
            isOwnerExperience = false
            isManagingRestaurant = false
            selectedOwnerRestaurantId = nil
            ownerRestaurants = []
            ownerBranding = nil
            ownerMetrics = NativeOwnerMetrics()
            AppLog.failure("loadOwnerContext", error)
        }
    }

    func openOwnerWorkspace() async {
        guard let userId = authUserID, isCurrentSession(userId) else { return }
        // Resolve the active role first. OwnerMainTabView loads operations
        // after entering; slow metrics must not leave this button inert.
        await loadOwnerContext(includeOperations: false)
        guard isCurrentSession(userId) else { return }
        guard isOwnerExperience else {
            lastError = "Ce compte n’a pas d’accès propriétaire actif."
            return
        }
        UserDefaults.standard.removeObject(forKey: workspacePreferenceKey(userId))
        isManagingRestaurant = true
        await configureRealtimeSubscriptions()
    }

    private func workspacePreferenceKey(_ userID: UUID) -> String { "preferredWorkspace.\(userID.uuidString)" }

    private func prefersCustomerWorkspace(_ userID: UUID) -> Bool {
        UserDefaults.standard.string(forKey: workspacePreferenceKey(userID)) == "customer"
    }

    func openCustomerWorkspace() async {
        if let userID = authUserID { UserDefaults.standard.set("customer", forKey: workspacePreferenceKey(userID)) }
        isManagingRestaurant = false
        requestedOwnerAccess = false
        await loadPortalData()
        await configureRealtimeSubscriptions()
    }

    private func loadOwnerMetrics() async {
        guard let userId = authUserID else { return }
        let startOfMonth = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: Date())) ?? Date()
        let iso = ISO8601DateFormatter().string(from: startOfMonth)
        var metrics = NativeOwnerMetrics()
        let selectedId = selectedOwnerRestaurantId
        // Figures follow the location picker: one location at a time.
        for restaurant in ownerRestaurants where selectedId == nil || restaurant.id == selectedId {
            do {
                struct ServiceDay: Decodable { let revenue: Double }
                let days: [ServiceDay] = try await client.from("service_days").select("revenue").eq("restaurant_id", value: restaurant.id).gte("date", value: String(iso.prefix(10))).execute().value
                metrics.monthRevenue += days.reduce(0) { $0 + $1.revenue }
                struct OrderRow: Decodable { let id: String }
                let orders: [OrderRow] = try await client.from("orders").select("id").eq("restaurant_id", value: restaurant.id).gte("created_at", value: iso).neq("status", value: "annulee").execute().value
                metrics.monthOrders += orders.count
            } catch {
                AppLog.failure("loadOwnerMetrics", error)
            }
        }
        guard isCurrentSession(userId), selectedOwnerRestaurantId == selectedId else { return }
        ownerMetrics = metrics
    }

    private func loadOwnerOrders() async {
        guard let userId = authUserID else { return }
        let selectedId = selectedOwnerRestaurantId
        var result: [NativeOwnerOrder] = []
        let restaurants = ownerRestaurants.filter { selectedOwnerRestaurantId == nil || $0.id == selectedOwnerRestaurantId }
        for restaurant in restaurants {
            do {
                let rows: [NativeOwnerOrder] = try await client.from("orders").select("id, restaurant_id, status, guest_name, total, created_at, requested_ready_at, estimated_ready_at, order_kind").eq("restaurant_id", value: restaurant.id).order("created_at", ascending: false).limit(50).execute().value
                result.append(contentsOf: rows)
            } catch { AppLog.failure("loadOwnerOrders", error) }
        }
        guard isCurrentSession(userId), selectedOwnerRestaurantId == selectedId else { return }
        ownerOrders = result.sorted { $0.createdAt > $1.createdAt }
    }

    /// All owner pages read directly through the caller's Supabase session.
    /// The member RLS policies remain the authorization boundary, including
    /// for the mutation methods below; no service-role credential is ever
    /// embedded in the iOS application.
    private func loadOwnerOperations(for restaurantId: String) async {
        guard let userId = authUserID else { return }
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
            guard isCurrentSession(userId), selectedOwnerRestaurantId == restaurantId else { return }
            ownerMenuItems = result.0
            ownerOffers = result.1
            ownerRewards = result.2
            ownerCustomers = result.3
            ownerEmployees = result.4
            ownerInventoryItems = result.5
            ownerTransactions = result.6
            ownerReviews = result.7
        } catch {
            AppLog.failure("loadOwnerOperations", error)
        }
    }

    var selectedOwnerRestaurant: NativeOwnerRestaurant? {
        ownerRestaurants.first(where: { $0.id == selectedOwnerRestaurantId })
    }

    func selectOwnerRestaurant(_ restaurantId: String) async {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }) else { return }
        selectedOwnerRestaurantId = restaurantId
        if let userId = authUserID { UserDefaults.standard.set(restaurantId, forKey: "selectedOwnerRestaurant.\(userId.uuidString)") }
        await loadOwnerMetrics()
        await loadSelectedOwnerBranding()
        await loadOwnerOrders()
        await loadOwnerOperations(for: restaurantId)
        await fetchOwnerMealSuggestions(for: restaurantId)
    }

    private func loadSelectedOwnerBranding() async {
        guard let userId = authUserID else { return }
        let restaurantId = selectedOwnerRestaurantId
        guard let workspaceId = selectedOwnerRestaurant?.workspaceId else { return }
        do {
            let brandings: [NativeOwnerBranding] = try await client
                .from("workspace_brand_settings")
                .select("brand_name, logo_url, primary_color, secondary_color, accent_color")
                .eq("workspace_id", value: workspaceId)
                .limit(1)
                .execute()
                .value
            guard isCurrentSession(userId), selectedOwnerRestaurantId == restaurantId else { return }
            ownerBranding = brandings.first
            if let ownerBranding {
                UserDefaults.standard.set(ownerBranding.primaryColor, forKey: "activeTenantPrimaryColor")
                UserDefaults.standard.set(ownerBranding.secondaryColor, forKey: "activeTenantSecondaryColor")
                UserDefaults.standard.set(ownerBranding.accentColor, forKey: "activeTenantAccentColor")
            }
        } catch {
            guard isCurrentSession(userId), selectedOwnerRestaurantId == restaurantId else { return }
            ownerBranding = nil
            AppLog.failure("loadSelectedOwnerBranding", error)
        }
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
            AppLog.failure("updateOwnerRestaurantName", error)
            return false
        }
    }

    func refreshOwnerOperations() async {
        guard let restaurantId = selectedOwnerRestaurantId, !isLoadingOwnerOperations else { return }
        isLoadingOwnerOperations = true
        defer { isLoadingOwnerOperations = false }
        async let metrics: Void = loadOwnerMetrics()
        async let orders: Void = loadOwnerOrders()
        async let operations: Void = loadOwnerOperations(for: restaurantId)
        async let ideas: Void = fetchOwnerMealSuggestions(for: restaurantId)
        async let branding: Void = loadSelectedOwnerBranding()
        _ = await (metrics, orders, operations, ideas, branding)
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
            AppLog.failure("lookupOwnerCustomersByPhone", error)
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
            AppLog.failure("confirmOwnerCustomerIdentity", error)
            return nil
        }
    }

    /// Records a counter visit through the existing atomic loyalty RPC. The
    /// database recalculates points from restaurant settings; the submitted
    /// points value is intentionally zero and ignored for authenticated users.
    /// Staff-only guest note (allergies, preferred table, wine). Lives in its own table so a
    /// guest, who can read their own customers row, never sees it.
    func fetchOwnerStaffNote(customerId: String) async -> String {
        struct Row: Decodable { let body: String }
        do {
            let rows: [Row] = try await client.from("customer_staff_notes")
                .select("body")
                .eq("customer_id", value: customerId)
                .limit(1)
                .execute().value
            return rows.first?.body ?? ""
        } catch {
            AppLog.failure("fetchOwnerStaffNote", error)
            return ""
        }
    }

    func saveOwnerStaffNote(customerId: String, body: String) async -> Bool {
        guard isOwnerExperience, let restaurantId = selectedOwnerRestaurantId,
              ownerRestaurants.contains(where: { $0.id == restaurantId }) else { return false }
        let trimmed = String(body.replacingOccurrences(of: "\r\n", with: "\n")
            .trimmingCharacters(in: .whitespacesAndNewlines).prefix(2000))
        struct Row: Encodable {
            let customer_id: String
            let restaurant_id: String
            let body: String
            let updated_by: String?
        }
        do {
            if trimmed.isEmpty {
                try await client.from("customer_staff_notes").delete().eq("customer_id", value: customerId).execute()
            } else {
                try await client.from("customer_staff_notes")
                    .upsert(Row(customer_id: customerId, restaurant_id: restaurantId, body: trimmed, updated_by: authUserID?.uuidString), onConflict: "customer_id")
                    .execute()
            }
            return true
        } catch {
            AppLog.failure("saveOwnerStaffNote", error)
            return false
        }
    }

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
            AppLog.failure("recordOwnerCustomerVisit", error)
            return nil
        }
    }

    func fetchMealSuggestions() async {
        guard let restaurantId = customer?.restaurantId else {
            customerMealSuggestions = []
            customerMealSuggestionsError = nil
            return
        }
        isLoadingCustomerMealSuggestions = true
        customerMealSuggestionsError = nil
        defer { isLoadingCustomerMealSuggestions = false }
        struct Params: Encodable { let p_restaurant_id: String }
        do {
            customerMealSuggestions = try await client.rpc("get_meal_suggestions", params: Params(p_restaurant_id: restaurantId)).execute().value
        } catch {
            customerMealSuggestions = []
            customerMealSuggestionsError = "Les suggestions ne sont pas disponibles. Vérifiez votre connexion, puis réessayez."
            AppLog.failure("fetchMealSuggestions", error)
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
            AppLog.failure("submitMealSuggestion", error)
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
            AppLog.failure("voteForMealSuggestion", error)
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
            AppLog.failure("fetchOwnerMealSuggestions", error)
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
            AppLog.failure("addMealSuggestionAsDraft", error)
            return false
        }
    }

    func updateOwnerMenuItem(_ item: NativeMenuItem, name: String, price: Double, priceOptions: [NativeMenuPriceOption], description: String?, active: Bool, allergens: [String], allergensConfirmed: Bool, imageUrl: String? = nil, imageChanged: Bool = false) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId, name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false, price >= 0 else { return false }
        var seenOptionIds = Set<String>()
        let validOptions = Array(priceOptions.prefix(20).filter {
            let unique = !$0.id.isEmpty && seenOptionIds.insert($0.id).inserted
            return unique && !$0.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && (1...999).contains($0.quantity) && $0.price > 0 && $0.price <= 1_000_000 && $0.price.isFinite
        })
        let savedPrice = validOptions.map(\.price).min() ?? price
        if active && item.isDraft == true && (savedPrice <= 0 || !allergensConfirmed) { return false }
        struct Patch: Encodable {
            let name: String
            let price: Double
            let priceOptions: [NativeMenuPriceOption]
            let description: String?
            let active: Bool
            let isDraft: Bool
            let allergens: [String]
            let allergensConfirmed: Bool
            enum CodingKeys: String, CodingKey {
                case name, price, description, active, allergens
                case priceOptions = "price_options"
                case isDraft = "is_draft"
                case allergensConfirmed = "allergens_confirmed"
            }
        }
        do {
            try await client.from("menu_items").update(Patch(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                price: savedPrice,
                priceOptions: validOptions,
                description: description?.trimmingCharacters(in: .whitespacesAndNewlines),
                active: active,
                isDraft: active ? false : (item.isDraft ?? false),
                allergens: allergens,
                allergensConfirmed: allergensConfirmed
            )).eq("restaurant_id", value: restaurantId).eq("id", value: item.id).execute()
            if imageChanged {
                // Explicit null so removing the photo really clears the column.
                struct ImagePatch: Encodable {
                    let url: String?
                    enum CodingKeys: String, CodingKey { case url = "image_url" }
                    func encode(to encoder: Encoder) throws {
                        var container = encoder.container(keyedBy: CodingKeys.self)
                        try container.encode(url, forKey: .url)
                    }
                }
                try await client.from("menu_items").update(ImagePatch(url: imageUrl)).eq("restaurant_id", value: restaurantId).eq("id", value: item.id).execute()
            }
            await refreshOwnerOperations()
            return true
        } catch { AppLog.failure("updateOwnerMenuItem", error); return false }
    }

    // MARK: - Owner offers (create from the phone)

    private struct OfferWrite: Encodable {
        let id: String?
        let restaurantId: String?
        let title: String
        let description: String?
        let price: Double?
        let startsAt: String?
        let endsAt: String?
        let imageUrl: String?
        let active: Bool
        enum CodingKeys: String, CodingKey {
            case id, title, description, price, active
            case restaurantId = "restaurant_id", startsAt = "starts_at", endsAt = "ends_at", imageUrl = "image_url"
        }
        // Explicit nulls: editing an offer must be able to clear dates/photo/price.
        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encodeIfPresent(id, forKey: .id)
            try c.encodeIfPresent(restaurantId, forKey: .restaurantId)
            try c.encode(title, forKey: .title)
            try c.encode(description, forKey: .description)
            try c.encode(price, forKey: .price)
            try c.encode(startsAt, forKey: .startsAt)
            try c.encode(endsAt, forKey: .endsAt)
            try c.encode(imageUrl, forKey: .imageUrl)
            try c.encode(active, forKey: .active)
        }
    }

    private func offerWrite(id: String?, restaurantId: String?, title: String, description: String?, price: Double?, startsAt: Date?, endsAt: Date?, imageUrl: String?, active: Bool) -> OfferWrite {
        let iso = ISO8601DateFormatter()
        let cleaned = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        return OfferWrite(id: id, restaurantId: restaurantId, title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                          description: (cleaned?.isEmpty ?? true) ? nil : cleaned, price: price,
                          startsAt: startsAt.map(iso.string(from:)), endsAt: endsAt.map(iso.string(from:)), imageUrl: imageUrl, active: active)
    }

    func createOwnerOffer(id: String, title: String, description: String?, price: Double?, startsAt: Date?, endsAt: Date?, imageUrl: String?, active: Bool) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        if let startsAt, let endsAt, endsAt <= startsAt { return false }
        do {
            try await client.from("offers").insert(offerWrite(id: id, restaurantId: restaurantId, title: title, description: description, price: price, startsAt: startsAt, endsAt: endsAt, imageUrl: imageUrl, active: active)).execute()
            await refreshOwnerOperations()
            Analytics.capture("owner_offer_created")
            return true
        } catch { AppLog.failure("createOwnerOffer", error); return false }
    }

    func updateOwnerOffer(id: String, title: String, description: String?, price: Double?, startsAt: Date?, endsAt: Date?, imageUrl: String?, active: Bool) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        if let startsAt, let endsAt, endsAt <= startsAt { return false }
        do {
            try await client.from("offers").update(offerWrite(id: nil, restaurantId: nil, title: title, description: description, price: price, startsAt: startsAt, endsAt: endsAt, imageUrl: imageUrl, active: active))
                .eq("restaurant_id", value: restaurantId).eq("id", value: id).execute()
            await refreshOwnerOperations()
            return true
        } catch { AppLog.failure("updateOwnerOffer", error); return false }
    }

    func setOwnerOfferActive(_ id: String, active: Bool) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId else { return false }
        struct Patch: Encodable { let active: Bool }
        do {
            try await client.from("offers").update(Patch(active: active)).eq("restaurant_id", value: restaurantId).eq("id", value: id).execute()
            await refreshOwnerOperations()
            return true
        } catch { AppLog.failure("setOwnerOfferActive", error); return false }
    }

    func deleteOwnerOffer(_ id: String) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId else { return false }
        do {
            try await client.from("offers").delete().eq("restaurant_id", value: restaurantId).eq("id", value: id).execute()
            await refreshOwnerOperations()
            return true
        } catch { AppLog.failure("deleteOwnerOffer", error); return false }
    }

    /// Sends the "new offer" push to customers (once per offer, server-enforced).
    func announceOwnerOffer(_ id: String) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId else { return false }
        struct Body: Encodable { let restaurantId: String }
        do {
            let _: Data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/native/owner/offers/\(id)/announce"),
                method: "POST",
                body: try JSONEncoder().encode(Body(restaurantId: restaurantId))
            )
            Analytics.capture("owner_offer_announced")
            return true
        } catch { AppLog.failure("announceOwnerOffer", error); return false }
    }

    // MARK: - Owner team member profile

    func fetchOwnerEmployeeProfile(employeeId: String) async -> OwnerEmployeeProfile? {
        guard let restaurantId = selectedOwnerRestaurantId else { return nil }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        let from = formatter.string(from: Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date())
        let to = formatter.string(from: Calendar.current.date(byAdding: .day, value: 21, to: Date()) ?? Date())
        do {
            let rows: [OwnerEmployeeProfile] = try await client.from("employees")
                .select("id, full_name, role_title, hourly_wage, active, description, contact_phone, contact_email, shift_schedules(id, shift_date, start_time, end_time, position_label, status)")
                .eq("restaurant_id", value: restaurantId).eq("id", value: employeeId)
                .gte("shift_schedules.shift_date", value: from)
                .lte("shift_schedules.shift_date", value: to)
                .order("shift_date", ascending: true, referencedTable: "shift_schedules")
                .limit(1).execute().value
            return rows.first
        } catch { AppLog.failure("fetchOwnerEmployeeProfile", error); return nil }
    }

    /// Contact details and notes for a team member (null clears a field).
    func updateOwnerEmployeeContact(employeeId: String, phone: String?, email: String?, notes: String?) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId else { return false }
        struct Patch: Encodable {
            let phone: String?; let email: String?; let notes: String?
            enum CodingKeys: String, CodingKey { case phone = "contact_phone", email = "contact_email", notes = "description" }
            func encode(to encoder: Encoder) throws {
                var c = encoder.container(keyedBy: CodingKeys.self)
                try c.encode(phone, forKey: .phone); try c.encode(email, forKey: .email); try c.encode(notes, forKey: .notes)
            }
        }
        func clean(_ value: String?) -> String? { let t = value?.trimmingCharacters(in: .whitespacesAndNewlines); return (t?.isEmpty ?? true) ? nil : t }
        do {
            try await client.from("employees").update(Patch(phone: clean(phone), email: clean(email), notes: clean(notes)))
                .eq("restaurant_id", value: restaurantId).eq("id", value: employeeId).execute()
            return true
        } catch { AppLog.failure("updateOwnerEmployeeContact", error); return false }
    }

    // MARK: - Owner customer profile

    /// One customer with the history the web customer page shows: loyalty
    /// activity and recent orders. RLS limits it to the owner's restaurant.
    func fetchOwnerCustomerProfile(customerId: String) async -> OwnerCustomerProfile? {
        guard let restaurantId = selectedOwnerRestaurantId else { return nil }
        do {
            let rows: [OwnerCustomerProfile] = try await client.from("customers")
                .select("id, name, email, phone, loyalty_points, visit_count, total_spent, last_visit_at, created_at, birthday, city, marketing_consent, loyalty_transactions(id, type, amount_spent, points_delta, note, created_at), orders(id, status, total, created_at, order_items(item_name, quantity))")
                .eq("restaurant_id", value: restaurantId).eq("id", value: customerId)
                .order("created_at", ascending: false, referencedTable: "loyalty_transactions")
                .limit(20, referencedTable: "loyalty_transactions")
                .order("created_at", ascending: false, referencedTable: "orders")
                .limit(15, referencedTable: "orders")
                .limit(1).execute().value
            return rows.first
        } catch { AppLog.failure("fetchOwnerCustomerProfile", error); return nil }
    }

    /// What the server actually delivered to the customer for the last order
    /// action ("push", "email"). Empty means nobody could be reached, so the
    /// owner is told the truth instead of "customer notified".
    var lastCustomerNotifyChannels: [String] = []

    func updateOwnerOrderStatus(_ orderId: String, restaurantId: String, status: String) async -> Bool {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }) else { return false }
        do {
            struct Body: Encodable { let restaurantId: String; let status: String; let cancellationReason: String? }
            let body = try JSONEncoder().encode(Body(
                restaurantId: restaurantId,
                status: status,
                cancellationReason: status == "annulee" ? "Un imprévu empêche le restaurant de préparer cette commande." : nil
            ))
            let data: Data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/native/owner/orders/\(orderId)/status"),
                method: "POST",
                body: body
            )
            struct Response: Decodable { let channels: [String]? }
            lastCustomerNotifyChannels = (try? JSONDecoder().decode(Response.self, from: data))?.channels ?? []
            await refreshOwnerOperations()
            Analytics.capture("owner_order_status_changed", ["status": status])
            return true
        } catch { AppLog.failure("updateOwnerOrderStatus", error); return false }
    }

    /// The native owner shell uses the same server-side delivery path as the
    /// web dashboard. The bearer token is verified again by the route before
    /// it can touch an order or invoke the service-role notification sender.
    func notifyOwnerOrder(_ orderId: String, restaurantId: String) async -> Bool {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }) else { return false }
        struct Body: Encodable { let restaurantId: String }
        do {
            let body = try JSONEncoder().encode(Body(restaurantId: restaurantId))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/native/owner/orders/\(orderId)/notify"),
                method: "POST",
                body: body
            )
            struct Delivery: Decodable { let ok: Bool; let channels: [String]? }
            let delivery = try JSONDecoder().decode(Delivery.self, from: data)
            lastCustomerNotifyChannels = delivery.channels ?? []
            return delivery.ok
        } catch {
            lastCustomerNotifyChannels = []
            lastError = "La notification n'a pas pu être envoyée. Réessayez."
            AppLog.failure("notifyOwnerOrder", error)
            return false
        }
    }

    func updateOwnerOrderETA(_ orderId: String, restaurantId: String, minutesFromNow: Int?) async -> Bool {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }),
              minutesFromNow == nil || (1...720).contains(minutesFromNow!) else { return false }
        struct Body: Encodable { let restaurantId: String; let minutesFromNow: Int? }
        do {
            let body = try JSONEncoder().encode(Body(restaurantId: restaurantId, minutesFromNow: minutesFromNow))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/native/owner/orders/\(orderId)/eta"),
                method: "POST",
                body: body
            )
            struct EtaResponse: Decodable { let ok: Bool; let channels: [String]? }
            let response = try JSONDecoder().decode(EtaResponse.self, from: data)
            lastCustomerNotifyChannels = response.channels ?? []
            if response.ok { await refreshOwnerOperations() }
            return response.ok
        } catch { AppLog.failure("updateOwnerOrderETA", error); return false }
    }

    /// Sends the owner's short note about an order (saved on the order, pushed
    /// to the customer's phone). `lastCustomerNotifyChannels` tells what reached them.
    func sendOwnerOrderMessage(_ orderId: String, restaurantId: String, message: String) async -> Bool {
        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }), !trimmed.isEmpty, trimmed.count <= 240 else { return false }
        struct Body: Encodable { let restaurantId: String; let message: String }
        struct Delivery: Decodable { let ok: Bool; let channels: [String]? }
        do {
            let body = try JSONEncoder().encode(Body(restaurantId: restaurantId, message: trimmed))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/native/owner/orders/\(orderId)/message"),
                method: "POST",
                body: body
            )
            let delivery = try JSONDecoder().decode(Delivery.self, from: data)
            lastCustomerNotifyChannels = delivery.channels ?? []
            Analytics.capture("owner_order_message_sent")
            return delivery.ok
        } catch { AppLog.failure("sendOwnerOrderMessage", error); return false }
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
        } catch { AppLog.failure("updateOwnerReviewResponse", error); return false }
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
        } catch { AppLog.failure("updateOwnerEmployee", error); return false }
    }

    func updateOwnerInventoryItem(_ item: NativeOwnerInventoryItem, quantity: Double, parLevel: Double?, unitCost: Double) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId, quantity >= 0, (parLevel ?? 0) >= 0, unitCost >= 0 else { return false }
        struct Patch: Encodable { let quantityOnHand: Double; let parLevel: Double?; let unitCost: Double
            enum CodingKeys: String, CodingKey { case quantityOnHand = "quantity_on_hand", parLevel = "par_level", unitCost = "unit_cost" }
        }
        do {
            try await client.from("inventory_items").update(Patch(quantityOnHand: quantity, parLevel: parLevel, unitCost: unitCost)).eq("restaurant_id", value: restaurantId).eq("id", value: item.id).execute()
            await refreshOwnerOperations()
            return true
        } catch { AppLog.failure("updateOwnerInventoryItem", error); return false }
    }

    /// Adds an inventory line to the selected location. Same RLS-scoped write
    /// as the web inventory page; no service credential is involved.
    func createOwnerInventoryItem(name: String, category: String?, unit: String, quantity: Double, parLevel: Double?, unitCost: Double) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId,
              !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              quantity >= 0, (parLevel ?? 0) >= 0, unitCost >= 0 else { return false }
        struct Row: Encodable {
            let restaurantId: String; let name: String; let category: String?; let unit: String
            let quantityOnHand: Double; let parLevel: Double?; let unitCost: Double
            enum CodingKeys: String, CodingKey {
                case name, category, unit
                case restaurantId = "restaurant_id", quantityOnHand = "quantity_on_hand", parLevel = "par_level", unitCost = "unit_cost"
            }
        }
        let cleanedUnit = unit.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanedCategory = category?.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            try await client.from("inventory_items").insert(Row(
                restaurantId: restaurantId,
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                category: (cleanedCategory?.isEmpty ?? true) ? nil : cleanedCategory,
                unit: cleanedUnit.isEmpty ? "unité" : cleanedUnit,
                quantityOnHand: quantity, parLevel: parLevel, unitCost: unitCost
            )).execute()
            await refreshOwnerOperations()
            Analytics.capture("owner_inventory_item_created")
            return true
        } catch { AppLog.failure("createOwnerInventoryItem", error); return false }
    }

    /// Adds a menu item. Without confirmed allergen information it is saved as
    /// a hidden draft, the same safety rule the edit sheet applies.
    func createOwnerMenuItem(id: String? = nil, imageUrl: String? = nil, name: String, category: String?, price: Double, description: String?, allergens: [String], allergensConfirmed: Bool, active: Bool) async -> Bool {
        guard let restaurantId = selectedOwnerRestaurantId,
              !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              price.isFinite, price >= 0 else { return false }
        let publishable = active && allergensConfirmed && price > 0
        struct Row: Encodable {
            let id: String?; let imageUrl: String?
            let restaurantId: String; let name: String; let category: String?; let price: Double
            let description: String?; let active: Bool; let isDraft: Bool
            let allergens: [String]; let allergensConfirmed: Bool
            enum CodingKeys: String, CodingKey {
                case id, name, category, price, description, active, allergens
                case imageUrl = "image_url"
                case restaurantId = "restaurant_id", isDraft = "is_draft", allergensConfirmed = "allergens_confirmed"
            }
        }
        let cleanedCategory = category?.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanedDescription = description?.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            try await client.from("menu_items").insert(Row(
                id: id, imageUrl: imageUrl,
                restaurantId: restaurantId,
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                category: (cleanedCategory?.isEmpty ?? true) ? nil : cleanedCategory,
                price: price,
                description: (cleanedDescription?.isEmpty ?? true) ? nil : cleanedDescription,
                active: publishable, isDraft: !publishable,
                allergens: allergens, allergensConfirmed: allergensConfirmed
            )).execute()
            await refreshOwnerOperations()
            Analytics.capture("owner_menu_item_created", ["published": publishable])
            return true
        } catch { AppLog.failure("createOwnerMenuItem", error); return false }
    }

    /// Lines, contact and payment details for one order, read with the
    /// owner's own session (member RLS on `orders` and `order_items`).
    func fetchOwnerOrderDetail(_ orderId: String) async -> NativeOwnerOrderDetail? {
        guard let restaurantId = selectedOwnerRestaurantId else { return nil }
        do {
            let detail: NativeOwnerOrderDetail = try await client.from("orders")
                .select("guest_phone, notes, payment_status, fulfillment_mode, subtotal, tax_amount, tip_amount, total, delivery_address, owner_message, order_items(id, item_name, unit_price, quantity, notes)")
                .eq("restaurant_id", value: restaurantId)
                .eq("id", value: orderId)
                .single().execute().value
            return detail
        } catch { AppLog.failure("fetchOwnerOrderDetail", error); return nil }
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
            AppLog.failure("updateName", error)
            return false
        }
    }

    /// Complete the verified customer's identity without changing restaurant roles.
    func completeCustomerFirstName(_ name: String) async -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let userID = authUserID, let customer, !trimmed.isEmpty, trimmed.count <= 80,
              trimmed.lowercased() != customer.email?.lowercased() else { return false }
        do {
            struct ProfilePatch: Encodable { let full_name: String }
            try await client.from("profiles").update(ProfilePatch(full_name: trimmed))
                .eq("id", value: userID.uuidString).execute()
            return await updateName(trimmed)
        } catch {
            AppLog.failure("completeCustomerFirstName", error)
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
            AppLog.failure("updatePhone", error)
            return false
        }
    }

    /// Uploads an owner-side image (menu item or offer) to a public bucket under
    /// `{restaurantId}/{scopeId}/…` — the folder the members-only storage policy
    /// checks — and returns its public URL.
    func uploadOwnerImage(_ data: Data, bucket: String, restaurantId: String, scopeId: String) async -> String? {
        guard ownerRestaurants.contains(where: { $0.id == restaurantId }), ["menu-item-images", "offer-images"].contains(bucket) else { return nil }
        let path = "\(restaurantId)/\(scopeId)/\(UUID().uuidString.lowercased()).jpg"
        do {
            try await client.storage.from(bucket).upload(path, data: data, options: FileOptions(contentType: "image/jpeg", upsert: false))
            return try client.storage.from(bucket).getPublicURL(path: path).absoluteString
        } catch {
            AppLog.failure("uploadOwnerImage", error)
            return nil
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
            AppLog.failure("uploadAvatar", error)
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
            AppLog.failure("updateNotificationFrequency", error)
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
            AppLog.failure("updateMarketingConsent", error)
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
            AppLog.failure("toggleFavoriteMenuItem", error)
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
            AppLog.failure("toggleFavoriteOffer", error)
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
            AppLog.failure("redeem", error)
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
            AppLog.failure("mintPairingCode", error)
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
            if let userId = authUserID { UserDefaults.standard.set(restaurantId, forKey: "activeCustomerRestaurant:\(userId.uuidString)") }
            menuItems = []
            myOrders = []
            await loadPortalData()
            return true
        } catch {
            lastError = "Impossible de devenir client pour l'instant. Réessayez."
            AppLog.failure("joinRestaurant", error)
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
        if let restaurantId = customer?.restaurantId { request.setValue(restaurantId, forHTTPHeaderField: "x-restaurant-id") }
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

    func fetchFlowAmbassador() async -> FlowAmbassadorDashboard? {
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/ambassador"))
            return try JSONDecoder().decode(FlowAmbassadorDashboard.self, from: data)
        } catch {
            lastError = "Le programme ambassadeur n’a pas pu être chargé. Réessayez."
            return nil
        }
    }

    func joinFlowAmbassador() async -> FlowAmbassadorDashboard? {
        await ambassadorRequest(["action": "join"])
    }

    func submitFlowAmbassadorUgc(restaurantProfileId: String, platform: String, postUrl: String, caption: String, referralLinkId: String?) async -> FlowAmbassadorDashboard? {
        var body: [String: Any] = [
            "action": "submitUgc", "restaurantProfileId": restaurantProfileId,
            "platform": platform, "postUrl": postUrl, "caption": caption,
            "disclosureConfirmed": true, "usageRightsConfirmed": true,
        ]
        if let referralLinkId { body["referralLinkId"] = referralLinkId }
        return await ambassadorRequest(body)
    }

    func createFlowAmbassadorLink(label: String, platform: String, contentUrl: String) async -> FlowAmbassadorDashboard? {
        await ambassadorRequest(["action": "createLink", "label": label, "platform": platform, "contentUrl": contentUrl])
    }

    private func ambassadorRequest(_ body: [String: Any]) async -> FlowAmbassadorDashboard? {
        guard let data = await ambassadorRequestData(body) else { return nil }
        return try? JSONDecoder().decode(FlowAmbassadorDashboard.self, from: data)
    }

    private func ambassadorRequestData(_ body: [String: Any]) async -> Data? {
        do {
            let requestBody = try JSONSerialization.data(withJSONObject: body)
            return try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/ambassador"), method: "POST", body: requestBody)
        } catch {
            lastError = "Cette action n’a pas abouti. Vérifiez votre connexion et réessayez."
            return nil
        }
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
            AppLog.failure("exportMyData", error)
            return nil
        }
    }

    /// Owner/manager account deletion over the Bearer bridge. Returns nil on success, otherwise the
    /// reason to show (for example a sole owner must transfer the restaurant first).
    func deleteOwnerAccount() async -> String? {
        struct Reply: Decodable { let error: String? }
        guard let token = await bearerToken() else { return "Votre session a expiré. Reconnectez-vous." }
        var request = URLRequest(url: Config.apiBaseURL.appending(path: "/api/owner/account"), timeoutInterval: 20)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let restaurantId = customer?.restaurantId { request.setValue(restaurantId, forHTTPHeaderField: "x-restaurant-id") }
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { return "La suppression a échoué. Réessayez." }
            if (200..<300).contains(http.statusCode) {
                await signOut()
                return nil
            }
            return (try? JSONDecoder().decode(Reply.self, from: data))?.error ?? "La suppression a échoué. Réessayez."
        } catch {
            AppLog.failure("deleteOwnerAccount", error)
            return "La suppression a échoué. Vérifiez votre connexion et réessayez."
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
            AppLog.failure("deleteAccount", error)
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
        guard let userId = authUserID, let customerId = customer?.id else { return }
        struct RestaurantInfoResponse: Decodable {
            let name: String
            let city: String?
            let timezone: String?
            let loyaltyTier2Threshold: Double
            let loyaltyTier3Threshold: Double
            let googleMapsUrl: String?
            let googlePlaceId: String?
            let phone: String?
            let isBusy: Bool?
        }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/restaurant"))
            let decoded = try JSONDecoder().decode(RestaurantInfoResponse.self, from: data)
            guard isCurrentSession(userId), customer?.id == customerId else { return }
            restaurantName = decoded.name
            restaurantCity = decoded.city
            if let identifier = decoded.timezone, let timezone = TimeZone(identifier: identifier) {
                restaurantTimezone = timezone
            }
            loyaltyTier2Threshold = decoded.loyaltyTier2Threshold
            loyaltyTier3Threshold = decoded.loyaltyTier3Threshold
            restaurantGoogleMapsUrl = decoded.googleMapsUrl
            restaurantGooglePlaceId = decoded.googlePlaceId
            restaurantPhone = decoded.phone
            restaurantIsBusy = decoded.isBusy ?? false
        } catch {
            AppLog.failure("fetchRestaurantInfo", error)
        }
    }

    /// Fetched lazily by the "Mes commandes" subpage only (not folded into
    /// loadPortalData) since order history, unlike points/rewards, is
    /// something a customer checks occasionally rather than on every app
    /// open — `orders_customer_select` already scopes this to the caller's
    /// own rows, no bridge endpoint needed.
    func loadMyOrders() async {
        guard let customerId = customer?.id, let restaurantId = customer?.restaurantId else { return }
        isLoadingOrders = true
        ordersLoadFailed = false
        defer { isLoadingOrders = false }
        do {
            let orders: [CustomerOrder] = try await client
                .from("orders")
                .select("id, status, total, created_at, estimated_ready_at, cancellation_reason, owner_message, order_items(id, menu_item_id, item_name, unit_price, quantity)")
                .eq("customer_id", value: customerId)
                .eq("restaurant_id", value: restaurantId)
                .order("created_at", ascending: false)
                .limit(100)
                .execute()
                .value
            myOrders = orders
        } catch {
            AppLog.failure("loadMyOrders", error)
            ordersLoadFailed = true
            lastError = "Impossible de charger vos commandes. Réessayez."
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
    /// One entry per establishment the account belongs to, with the favourite
    /// dishes and offers saved there. The home establishment reuses what is
    /// already loaded; the others are fetched (menu through the bridge, which
    /// only answers for establishments the caller is a customer of).
    func loadFavoritesByEstablishment() async -> [EstablishmentFavorites] {
        var result: [EstablishmentFavorites] = []
        for membership in allMemberships {
            let row = allCustomers.first { $0.restaurantId == membership.restaurantId }
            let itemIds = Set(row?.favoriteMenuItemIds ?? [])
            let offerIds = Set(row?.favoriteOfferIds ?? [])
            let isHome = membership.restaurantId == customer?.restaurantId
            var items: [NativeMenuItem] = []
            var offersFound: [Offer] = []
            var failed = false

            if isHome {
                items = menuItems.filter { itemIds.contains($0.id) }
                offersFound = offers.filter { offerIds.contains($0.id) }
            } else {
                if !itemIds.isEmpty {
                    if let fetched = await fetchMenuItems(forRestaurant: membership.restaurantId) {
                        items = fetched.filter { itemIds.contains($0.id) }
                    } else { failed = true }
                }
                if !offerIds.isEmpty {
                    do {
                        offersFound = try await client
                            .from("offers")
                            .select()
                            .in("id", values: Array(offerIds))
                            .execute()
                            .value
                    } catch {
                        AppLog.failure("loadFavoritesByEstablishment (offers)", error)
                        failed = true
                    }
                }
            }
            result.append(EstablishmentFavorites(
                id: membership.restaurantId,
                name: membership.restaurantName,
                items: items,
                offers: offersFound,
                savedCount: itemIds.count + offerIds.count,
                isHome: isHome,
                loadFailed: failed
            ))
        }
        // The home establishment first, then those that actually have favourites.
        return result.sorted { lhs, rhs in
            if lhs.isHome != rhs.isHome { return lhs.isHome }
            if (lhs.savedCount > 0) != (rhs.savedCount > 0) { return lhs.savedCount > 0 }
            return lhs.name < rhs.name
        }
    }

    private func fetchMenuItems(forRestaurant restaurantId: String) async -> [NativeMenuItem]? {
        do {
            let url = Config.apiBaseURL.appending(path: "/api/portal/menu")
                .appending(queryItems: [URLQueryItem(name: "restaurantId", value: restaurantId)])
            let data = try await authorizedRequest(url)
            return try JSONDecoder().decode(MenuResponse.self, from: data).items.filter { $0.active && $0.isDraft != true && $0.isOrderable != false }
        } catch {
            AppLog.failure("fetchMenuItems(forRestaurant:)", error)
            return nil
        }
    }

    /// Credits the owner-configured "app install" bonus, once per card, the first
    /// time this account opens the app. The database function is idempotent and
    /// only touches the caller's own cards, so calling it again is harmless.
    func claimAppInstallBonusIfNeeded() async {
        guard !hasClaimedAppBonusThisSession else { return }
        hasClaimedAppBonusThisSession = true
        do {
            let awards: [AppBonusAward] = try await client.rpc("claim_app_install_bonus").execute().value
            guard !awards.isEmpty else { return }
            appBonusAwards = awards
            // The balance changed on the server: refresh so Home shows it.
            await loadPortalData()
        } catch {
            AppLog.failure("claimAppInstallBonus", error)
        }
    }

    func fetchAllMemberships() async {
        guard !isLoadingHistory else { return }
        isLoadingHistory = true
        historyError = nil
        defer { isLoadingHistory = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/restaurants"))
            let decoded = try JSONDecoder().decode(RestaurantMembershipsResponse.self, from: data)
            allMemberships = decoded.memberships
        } catch {
            historyError = "Impossible de charger vos cartes. Réessayez."
            AppLog.failure("fetchAllMemberships", error)
        }

        // Load each ledger independently: one failed request must not erase
        // successfully loaded activity or turn a network failure into an empty state.
        do {
            allTransactions = try await client.from("loyalty_transactions")
                .select().order("created_at", ascending: false).limit(500).execute().value
        } catch {
            historyError = "Impossible de charger tous les mouvements de points. Réessayez."
            AppLog.failure("fetchAllMemberships (transactions)", error)
        }
        do {
            allRedemptions = try await client.from("reward_redemptions")
                .select().order("created_at", ascending: false).limit(500).execute().value
        } catch {
            historyError = "Impossible de charger tous les échanges de récompenses. Réessayez."
            AppLog.failure("fetchAllMemberships (redemptions)", error)
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
        // Redemption RPC writes both rows in the same database transaction.
        // Match one-for-one so two equally priced rewards remain distinct.
        var unmatchedRedemptions = allRedemptions
        let ledgerTransactions = allTransactions.filter { tx in
            guard tx.type == "echange", let index = unmatchedRedemptions.firstIndex(where: {
                $0.restaurantId == tx.restaurantId && $0.pointsSpent == -tx.pointsDelta &&
                abs($0.createdAt.timeIntervalSince(tx.createdAt)) < 0.001
            }) else { return true }
            unmatchedRedemptions.remove(at: index)
            return false
        }
        let fromTransactions = ledgerTransactions.map { tx in
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
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/menu"))
            let decoded = try JSONDecoder().decode(MenuResponse.self, from: data)
            menuItems = decoded.items.filter { $0.active && $0.isDraft != true && $0.isOrderable != false }
            taxRate = decoded.taxRate
            acceptsTips = decoded.acceptsTips
            onlinePaymentEnabled = decoded.onlinePaymentEnabled
            canPayAtReceipt = decoded.canPayAtReceipt ?? true
            canPayOnline = decoded.canPayOnline ?? decoded.onlinePaymentEnabled
            pickupEnabled = decoded.pickupEnabled ?? true
            deliveryEnabled = decoded.deliveryEnabled
            lastError = nil
        } catch let error as URLError where error.code == .notConnectedToInternet {
            lastError = "Connexion indisponible. Vérifiez votre réseau et réessayez."
        } catch {
            lastError = "Le menu n’a pas pu être chargé. Réessayez."
            AppLog.failure("fetchMenu", error)
        }
    }


    /// Downloads the signed pass for the selected loyalty relationship. The
    /// request carries the current Supabase bearer token, so the server can
    /// scope the pass to the authenticated customer instead of trusting a
    /// client-provided identity.
    enum WalletPassResult { case pass(Data), notAvailable, signedOut, failure }

    /// Apple Wallet pass for one of the signed-in person's cards. The server answers 503
    /// while the restaurant platform has no Wallet certificate, 401 when the session ended.
    func downloadAppleWalletPass(customerId: String) async -> WalletPassResult {
        guard let token = await bearerToken() else { return .signedOut }
        var components = URLComponents(url: Config.apiBaseURL.appending(path: "/api/wallet/apple"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "customerId", value: customerId)]
        guard let url = components?.url else { return .failure }
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let restaurantId = customer?.restaurantId { request.setValue(restaurantId, forHTTPHeaderField: "x-restaurant-id") }
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { return .failure }
            switch http.statusCode {
            case 200..<300: return .pass(data)
            case 401: return .signedOut
            case 503: return .notAvailable
            default:
                AppLog.failure("downloadAppleWalletPass", URLError(.badServerResponse))
                return .failure
            }
        } catch {
            AppLog.failure("downloadAppleWalletPass", error)
            return .failure
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
            AppLog.failure("fetchReferrals", error)
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
            AppLog.failure("createReferralLink", error)
            return nil
        }
    }

    struct OrderResult { let ok: Bool; let orderId: String?; let estimatedReadyAt: Date?; let paymentURL: URL?; let paymentConfirmed: Bool }
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
            AppLog.failure("quoteDelivery", error)
            return nil
        }
    }

    func submitServiceQuote(
        quoteType: String,
        guestName: String,
        guestPhone: String,
        guestEmail: String,
        description: String,
        eventAt: Date,
        guestCount: Int?,
        fulfillmentMode: String,
        deliveryAddress: String?,
        clientNotes: String?
    ) async -> Bool {
        struct Body: Encodable {
            let quoteType: String
            let guestName: String
            let guestPhone: String
            let guestEmail: String
            let description: String
            let eventAtLocal: String
            let guestCount: Int?
            let fulfillmentMode: String
            let deliveryAddress: String?
            let clientNotes: String?
        }
        struct Response: Decodable { let ok: Bool; let id: String?; let reason: String? }
        guard customer != nil else {
            lastError = "Connectez-vous à votre compte client pour envoyer une demande."
            return false
        }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let body = Body(
            quoteType: quoteType,
            guestName: guestName,
            guestPhone: guestPhone,
            guestEmail: guestEmail,
            description: description,
            eventAtLocal: formatter.string(from: eventAt),
            guestCount: guestCount,
            fulfillmentMode: fulfillmentMode,
            deliveryAddress: deliveryAddress,
            clientNotes: clientNotes
        )
        do {
            lastError = nil
            let data = try JSONEncoder().encode(body)
            let responseData = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/portal/service-quotes"),
                method: "POST",
                body: data
            )
            let response = try JSONDecoder().decode(Response.self, from: responseData)
            guard response.ok, response.id != nil else {
                lastError = response.reason == "rate_limited"
                    ? "Trop de demandes ont été envoyées. Réessayez plus tard."
                    : "La demande n’a pas pu être envoyée. Vérifiez les renseignements et réessayez."
                return false
            }
            await fetchCustomerServiceQuotes()
            return true
        } catch {
            lastError = "La demande de devis n’a pas pu être envoyée. Vérifiez votre connexion et réessayez."
            AppLog.failure("submitServiceQuote", error)
            return false
        }
    }

    func fetchCustomerServiceQuotes() async {
        guard customer != nil else {
            customerServiceQuotes = []
            customerServiceQuotesError = nil
            return
        }
        isLoadingCustomerServiceQuotes = true
        customerServiceQuotesError = nil
        defer { isLoadingCustomerServiceQuotes = false }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/service-quotes"))
            struct Response: Decodable { let quotes: [NativeServiceQuote] }
            customerServiceQuotes = try JSONDecoder().decode(Response.self, from: data).quotes
        } catch {
            customerServiceQuotesError = "Les demandes de devis n’ont pas pu être chargées. Vérifiez votre connexion, puis réessayez."
            AppLog.failure("fetchCustomerServiceQuotes", error)
        }
    }

    /// estimatedReadyAt arrives as a raw ISO8601 string (the bridge routes
    /// never configure JSONDecoder's dateDecodingStrategy — only the direct
    /// Supabase client calls elsewhere get automatic Date decoding, via the
    /// SDK's own internal decoder), so this is parsed by hand rather than
    /// declared as `Date?` on OrderResponse directly.
    func submitOrder(cart: [String: Int], tipAmount: Double, paymentMethod: String?, requestedReadyAt: Date? = nil, payOnline: Bool = false, delivery: DeliveryOrderInfo? = nil, idempotencyKey: String, customerNote: String? = nil) async -> OrderResult {
        struct CartLine: Encodable { let menuItemId: String; let quantity: Int; let priceOptionId: String? }
        struct OrderBody: Encodable { let cart: [CartLine]?; let tipAmount: Double?; let paymentMethod: String?; let payOnline: Bool?; let delivery: DeliveryOrderInfo?; let requestedReadyAtLocal: String?; let idempotencyKey: String; let resumeOnly: Bool?; let customerNote: String? }
        struct OrderResponse: Decodable { let ok: Bool; let orderId: String?; let estimatedReadyAt: String?; let paymentUrl: String?; let paymentConfirmed: Bool? }

        let lines = cart.sorted(by: { $0.key < $1.key }).compactMap { key, qty -> CartLine? in
            guard qty > 0 else { return nil }
            let parts = key.components(separatedBy: "::")
            guard let menuItemId = parts.first, !menuItemId.isEmpty else { return nil }
            let optionId = parts.count > 1 ? parts.dropFirst().joined(separator: "::") : nil
            return CartLine(menuItemId: menuItemId, quantity: qty, priceOptionId: optionId)
        }
        guard !lines.isEmpty else { return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil, paymentConfirmed: false) }
        guard !payOnline || onlinePaymentEnabled else { return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil, paymentConfirmed: false) }

        do {
            let dateFormatter = ISO8601DateFormatter()
            let bodyData = try JSONEncoder().encode(OrderBody(
                cart: lines,
                tipAmount: tipAmount,
                paymentMethod: paymentMethod,
                payOnline: payOnline,
                delivery: delivery,
                requestedReadyAtLocal: requestedReadyAt.map(dateFormatter.string(from:)),
                idempotencyKey: idempotencyKey,
                resumeOnly: nil,
                customerNote: customerNote
            ))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/portal/orders"),
                method: "POST",
                body: bodyData
            )
            let decoded = try JSONDecoder().decode(OrderResponse.self, from: data)
            let eta = decoded.estimatedReadyAt.flatMap { ISO8601DateFormatter().date(from: $0) }
            return OrderResult(ok: decoded.ok, orderId: decoded.orderId, estimatedReadyAt: eta, paymentURL: decoded.paymentUrl.flatMap(URL.init(string:)), paymentConfirmed: decoded.paymentConfirmed ?? false)
        } catch let error as URLError where error.code == .notConnectedToInternet {
            lastError = "Aucune connexion internet. Votre commande n'a pas été envoyée."
            return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil, paymentConfirmed: false)
        } catch {
            lastError = "La commande a échoué. Réessayez."
            AppLog.failure("submitOrder", error)
            return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil, paymentConfirmed: false)
        }
    }

    /// Recovers the durable order/online checkout after a lost response or
    /// app restart. The server scopes the key to the authenticated customer.
    func resumeOrder(idempotencyKey: String) async -> OrderResult {
        struct ResumeBody: Encodable { let idempotencyKey: String; let resumeOnly = true }
        struct OrderResponse: Decodable { let ok: Bool; let orderId: String?; let estimatedReadyAt: String?; let paymentUrl: String?; let paymentConfirmed: Bool? }
        do {
            let bodyData = try JSONEncoder().encode(ResumeBody(idempotencyKey: idempotencyKey))
            let data = try await authorizedRequest(
                Config.apiBaseURL.appending(path: "/api/portal/orders"),
                method: "POST",
                body: bodyData
            )
            let decoded = try JSONDecoder().decode(OrderResponse.self, from: data)
            let eta = decoded.estimatedReadyAt.flatMap { ISO8601DateFormatter().date(from: $0) }
            return OrderResult(ok: decoded.ok, orderId: decoded.orderId, estimatedReadyAt: eta, paymentURL: decoded.paymentUrl.flatMap(URL.init(string:)), paymentConfirmed: decoded.paymentConfirmed ?? false)
        } catch {
            return OrderResult(ok: false, orderId: nil, estimatedReadyAt: nil, paymentURL: nil, paymentConfirmed: false)
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
            AppLog.failure("submitSurvey", error)
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
            AppLog.failure("fetchNearbyRestaurants", error)
        }
    }

    func fetchPopularNearby() async {
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/popular"))
            popularNearby = try JSONDecoder().decode(PopularMenuItemsResponse.self, from: data).items
        } catch {
            AppLog.failure("fetchPopularNearby", error)
        }
    }

    func fetchRestaurantDetail(id: String) async -> DiscoverRestaurantResponse? {
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/discover/\(id)"))
            return try JSONDecoder().decode(DiscoverRestaurantResponse.self, from: data)
        } catch {
            lastError = "Impossible de charger ce restaurant."
            AppLog.failure("fetchRestaurantDetail", error)
            return nil
        }
    }

    enum ScanResult { case success(restaurant: (id: String, name: String), branding: NativeTenantBranding?); case failure(String) }

    /// Resolves a scanned table QR (the same menu_shares token the web's
    /// own /m/[token] ordering page uses) to a restaurant — see
    /// app/api/portal/scan/[token]/route.ts's own comment.
    func resolveScanToken(_ token: String) async -> ScanResult {
        struct ScanResponse: Decodable {
            let restaurantId: String
            let restaurantName: String
            let branding: NativeTenantBranding?
        }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/scan/\(token)"))
            let decoded = try JSONDecoder().decode(ScanResponse.self, from: data)
            return .success(restaurant: (id: decoded.restaurantId, name: decoded.restaurantName), branding: decoded.branding)
        } catch {
            AppLog.failure("resolveScanToken", error)
            return .failure("Ce code ne correspond à aucun restaurant Minerva Flow.")
        }
    }

    func fetchTenantBranding(for restaurantId: String) async {
        guard let userId = authUserID else { return }
        struct BrandingResponse: Decodable { let branding: NativeTenantBranding }
        do {
            let data = try await authorizedRequest(Config.apiBaseURL.appending(path: "/api/portal/restaurant/\(restaurantId)/branding"))
            let response = try JSONDecoder().decode(BrandingResponse.self, from: data)
            guard isCurrentSession(userId), customer?.restaurantId == restaurantId else { return }
            activateTenantBranding(response.branding)
        } catch {
            AppLog.failure("fetchTenantBranding", error)
        }
    }

    func activateTenantBranding(_ branding: NativeTenantBranding?) {
        activeTenantBranding = branding
        guard let branding else {
            UserDefaults.standard.removeObject(forKey: "activeTenantPrimaryColor")
            UserDefaults.standard.removeObject(forKey: "activeTenantSecondaryColor")
            UserDefaults.standard.removeObject(forKey: "activeTenantAccentColor")
            return
        }
        UserDefaults.standard.set(branding.primaryColor, forKey: "activeTenantPrimaryColor")
        UserDefaults.standard.set(branding.secondaryColor, forKey: "activeTenantSecondaryColor")
        UserDefaults.standard.set(branding.accentColor, forKey: "activeTenantAccentColor")
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
            AppLog.failure("fetchReviews", error)
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
            AppLog.failure("submitReview", error)
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
            AppLog.failure("fetchRestaurantReviews", error)
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
            AppLog.failure("uploadReviewImage", error)
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
            AppLog.failure("submitRestaurantReview", error)
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
            AppLog.failure("fetchOfferReviews", error)
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
            AppLog.failure("submitOfferReview", error)
            return false
        }
    }

    // MARK: - Push notifications

    /// device_push_tokens_owner_all (auth.uid() = user_id) makes this a
    /// direct, RLS-scoped upsert — no bridge needed. Actually delivering a
    /// push still requires a real APNs auth key configured server-side
    /// (see docs/mobile/native-build-status.html); this half of the pipeline
    /// (permission, registration, token storage) works regardless of that.
    func registerPushToken(_ tokenData: Data) async {
        let token = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
        UserDefaults.standard.set(token, forKey: "minervaAPNsDeviceToken")
        await persistPushToken(token)
    }

    private func registerStoredPushToken() async {
        guard let token = UserDefaults.standard.string(forKey: "minervaAPNsDeviceToken") else { return }
        await persistPushToken(token)
    }

    private func persistPushToken(_ token: String) async {
        guard let userId = try? await client.auth.session.user.id else { return }
        do {
            struct TokenRow: Encodable {
                let user_id: UUID
                let token: String
                let platform: String
                let apns_environment: String
            }
            // Xcode/dev builds get sandbox tokens; TestFlight and the App
            // Store get production ones. The server routes on this value.
            #if DEBUG
            let environment = "sandbox"
            #else
            let environment = "production"
            #endif
            try await client
                .from("device_push_tokens")
                .upsert(TokenRow(user_id: userId, token: token, platform: "ios", apns_environment: environment), onConflict: "user_id,token")
                .execute()
        } catch {
            AppLog.failure("registerPushToken", error)
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
            AppLog.failure("submitAnnouncementVote", error)
        }
    }
}

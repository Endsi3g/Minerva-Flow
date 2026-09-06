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
    @Published var offers: [Offer] = []
    @Published var restaurantName: String?
    @Published var isLoadingData = false

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
    func sendCode(email: String) async throws {
        try await client.auth.signInWithOTP(
            email: email,
            data: ["is_customer": .bool(true)]
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

            let (txs, rewardsResult, offersResult, restaurantRow) = try await (
                txsFetch, rewardsFetch, offersFetch, restaurantFetch
            )
            transactions = txs
            rewards = rewardsResult
            offers = offersResult.filter { $0.isLive }
            restaurantName = restaurantRow.name
        } catch {
            print("loadPortalData error: \(error)")
        }
    }
}

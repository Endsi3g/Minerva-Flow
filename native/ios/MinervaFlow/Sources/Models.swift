import Foundation

struct NativeChangelogEntry: Decodable, Identifiable {
    let id: String
    let title: String
    let description: String
    let category: String
    let publishedAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, description, category
        case publishedAt = "published_at"
    }
}

struct NativeOwnerRestaurant: Codable, Identifiable {
    let id: String
    let name: String
    let city: String?
    let workspaceId: String?

    enum CodingKeys: String, CodingKey {
        case id, name, city, workspaceId = "workspace_id"
    }
}

struct NativeOwnerBranding: Codable {
    let brandName: String
    let logoUrl: String?
    let primaryColor: String
    let secondaryColor: String
    let accentColor: String

    enum CodingKeys: String, CodingKey {
        case brandName = "brand_name"
        case logoUrl = "logo_url"
        case primaryColor = "primary_color"
        case secondaryColor = "secondary_color"
        case accentColor = "accent_color"
    }

    init(
        brandName: String,
        logoUrl: String? = nil,
        primaryColor: String = "#167F5B",
        secondaryColor: String = "#0E5A40",
        accentColor: String = "#DFFF5F"
    ) {
        self.brandName = brandName
        self.logoUrl = logoUrl
        self.primaryColor = primaryColor
        self.secondaryColor = secondaryColor
        self.accentColor = accentColor
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.brandName = try container.decodeIfPresent(String.self, forKey: .brandName) ?? "Minerva Flow"
        self.logoUrl = try container.decodeIfPresent(String.self, forKey: .logoUrl)
        self.primaryColor = try container.decodeIfPresent(String.self, forKey: .primaryColor) ?? "#167F5B"
        self.secondaryColor = try container.decodeIfPresent(String.self, forKey: .secondaryColor) ?? "#0E5A40"
        self.accentColor = try container.decodeIfPresent(String.self, forKey: .accentColor) ?? "#DFFF5F"
    }
}

/// Branding that is safe to return to an authenticated customer app. It is
/// scoped to the restaurant's workspace so every location in a franchise
/// can share one identity without a separate app build.
struct NativeTenantBranding: Codable, Equatable {
    let restaurantId: String
    let workspaceId: String?
    let brandName: String
    let logoUrl: String?
    let primaryColor: String
    let secondaryColor: String
    let accentColor: String

    enum CodingKeys: String, CodingKey {
        case restaurantId, workspaceId, brandName, logoUrl, primaryColor, secondaryColor, accentColor
    }
}

struct NativeOwnerMetrics {
    var monthRevenue: Double = 0
    var monthOrders: Int = 0
    var retentionRevenue: Double = 0
}

struct NativeOwnerOrder: Codable, Identifiable {
    let id: String
    let restaurantId: String
    let status: String
    let guestName: String
    let total: Double
    let createdAt: String
    let requestedReadyAt: String?
    let estimatedReadyAt: String?
    let orderKind: String?
    enum CodingKeys: String, CodingKey {
        case id, status, total
        case restaurantId = "restaurant_id"
        case guestName = "guest_name"
        case createdAt = "created_at"
        case requestedReadyAt = "requested_ready_at"
        case estimatedReadyAt = "estimated_ready_at"
        case orderKind = "order_kind"
    }
}

struct NativeMealSuggestion: Codable, Identifiable {
    let id: String
    let restaurantId: String
    let title: String
    let description: String?
    let status: String
    let menuItemId: String?
    let createdAt: String
    let voteCount: Int
    let hasVoted: Bool

    enum CodingKeys: String, CodingKey {
        case id, title, description, status
        case restaurantId = "restaurant_id"
        case menuItemId = "menu_item_id"
        case createdAt = "created_at"
        case voteCount = "vote_count"
        case hasVoted = "has_voted"
    }
}

struct NativeMealSuggestionVoteResult: Decodable {
    let voteCount: Int
    let hasVoted: Bool
    enum CodingKeys: String, CodingKey { case voteCount = "vote_count", hasVoted = "has_voted" }
}

struct NativeOwnerCustomer: Codable, Identifiable {
    let id: String
    let name: String
    let email: String?
    let phone: String?
    let loyaltyPoints: Int
    let visitCount: Int
    let totalSpent: Double
    enum CodingKeys: String, CodingKey {
        case id, name, email, phone
        case loyaltyPoints = "loyalty_points"
        case visitCount = "visit_count"
        case totalSpent = "total_spent"
    }
}

/// Minimal counter lookup result. Deliberately excludes loyalty totals until
/// the customer confirms possession of the rotating pairing code.
struct NativeOwnerCustomerLookup: Codable, Identifiable {
    let id: String
    let name: String
    let phone: String?
    enum CodingKeys: String, CodingKey {
        case id = "customer_id"
        case name = "customer_name"
        case phone = "customer_phone"
    }
}

struct NativeCounterCustomer: Codable, Identifiable {
    let id: String
    let name: String
    let phone: String?
    let loyaltyPoints: Int
    let visitCount: Int
    let totalSpent: Double
    enum CodingKeys: String, CodingKey {
        case id = "customer_id"
        case name = "customer_name"
        case phone = "customer_phone"
        case loyaltyPoints = "loyalty_points"
        case visitCount = "visit_count"
        case totalSpent = "total_spent"
    }
}

struct NativeServiceQuote: Codable, Identifiable {
    let id: String
    let quoteType: String
    let status: String
    let eventAt: String?
    let guestCount: Int?
    let fulfillmentMode: String
    let currency: String?
    let subtotal: Double?
    let taxAmount: Double?
    let total: Double?
    let depositPercent: Double?
    let depositAmount: Double?
    let expiresAt: String?
    let checkoutUrl: String?
    let ownerNotes: String?
    let orderStatus: String?
    let paymentStatus: String?
    let lines: [NativeServiceQuoteLine]

    init(
        id: String,
        quoteType: String,
        status: String,
        eventAt: String?,
        guestCount: Int?,
        fulfillmentMode: String,
        currency: String? = nil,
        subtotal: Double? = nil,
        taxAmount: Double? = nil,
        total: Double? = nil,
        depositPercent: Double? = nil,
        depositAmount: Double? = nil,
        expiresAt: String? = nil,
        checkoutUrl: String? = nil,
        ownerNotes: String? = nil,
        orderStatus: String? = nil,
        paymentStatus: String? = nil,
        lines: [NativeServiceQuoteLine] = []
    ) {
        self.id = id
        self.quoteType = quoteType
        self.status = status
        self.eventAt = eventAt
        self.guestCount = guestCount
        self.fulfillmentMode = fulfillmentMode
        self.currency = currency
        self.subtotal = subtotal
        self.taxAmount = taxAmount
        self.total = total
        self.depositPercent = depositPercent
        self.depositAmount = depositAmount
        self.expiresAt = expiresAt
        self.checkoutUrl = checkoutUrl
        self.ownerNotes = ownerNotes
        self.orderStatus = orderStatus
        self.paymentStatus = paymentStatus
        self.lines = lines
    }

    enum CodingKeys: String, CodingKey {
        case id, status, currency, subtotal, total
        case quoteType = "quote_type"
        case eventAt = "event_at"
        case guestCount = "guest_count"
        case fulfillmentMode = "fulfillment_mode"
        case taxAmount = "tax_amount"
        case depositPercent = "deposit_percent"
        case depositAmount = "deposit_amount"
        case expiresAt = "expires_at"
        case checkoutUrl = "checkout_url"
        case ownerNotes = "owner_notes"
        case orderStatus = "order_status"
        case paymentStatus = "payment_status"
        case lines = "service_quote_lines"
    }
}

struct NativeServiceQuoteLine: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let quantity: Int
    let unitPrice: Double

    enum CodingKeys: String, CodingKey {
        case id, name, description, quantity
        case unitPrice = "unit_price"
    }
}

struct NativeOwnerReward: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let pointsCost: Int
    let active: Bool
    enum CodingKeys: String, CodingKey { case id, name, description, active; case pointsCost = "points_cost" }
}

struct NativeOwnerEmployee: Codable, Identifiable {
    let id: String
    var fullName: String
    var roleTitle: String
    var hourlyWage: Double?
    var active: Bool
    enum CodingKeys: String, CodingKey {
        case id, active
        case fullName = "full_name"
        case roleTitle = "role_title"
        case hourlyWage = "hourly_wage"
    }
}

struct NativeOwnerInventoryItem: Codable, Identifiable {
    let id: String
    var name: String
    var quantityOnHand: Double
    var unit: String
    var parLevel: Double?
    var unitCost: Double
    var supplierId: String?
    enum CodingKeys: String, CodingKey {
        case id, name, unit
        case quantityOnHand = "quantity_on_hand"
        case parLevel = "par_level"
        case unitCost = "unit_cost"
        case supplierId = "supplier_id"
    }
}

struct NativeOwnerFinancialTransaction: Codable, Identifiable {
    let id: String
    let date: String
    let description: String
    let amount: Double
    let direction: String
    let category: String
}

struct NativeOwnerRestaurantReview: Codable, Identifiable {
    let id: String
    let rating: Int
    let comment: String?
    var ownerResponse: String?
    let createdAt: Date
    enum CodingKeys: String, CodingKey {
        case id, rating, comment
        case ownerResponse = "owner_response"
        case createdAt = "created_at"
    }
}
import SwiftUI

struct Customer: Codable, Identifiable {
    let id: String
    let restaurantId: String
    var name: String
    var email: String?
    var phone: String?
    var avatarUrl: String?
    let visitCount: Int
    let totalSpent: Double
    var loyaltyPoints: Int
    var notificationFrequency: String
    var marketingConsent: Bool
    var favoriteOfferIds: [String]
    var favoriteMenuItemIds: [String]
    var birthday: String?

    enum CodingKeys: String, CodingKey {
        case id
        case restaurantId = "restaurant_id"
        case name
        case email
        case phone
        case avatarUrl = "avatar_url"
        case visitCount = "visit_count"
        case totalSpent = "total_spent"
        case loyaltyPoints = "loyalty_points"
        case notificationFrequency = "notification_frequency"
        case marketingConsent = "marketing_consent"
        case favoriteOfferIds = "favorite_offer_ids"
        case favoriteMenuItemIds = "favorite_menu_item_ids"
        case birthday
    }
}

struct FlowAmbassadorCommission: Codable, Identifiable {
    let id: String
    let amount: Double
    let currency: String
    let payableAt: String
    let status: String
    let transferId: String?
    enum CodingKeys: String, CodingKey {
        case id, amount, currency, status
        case payableAt = "payableAt"
        case transferId = "transferId"
    }
}

struct FlowAmbassadorSummary: Codable {
    let code: String
    let referrals: Int
    let links: [FlowAmbassadorTrackedLink]?
    let stripeConnected: Bool
    let commissions: [FlowAmbassadorCommission]
}

struct FlowAmbassadorTrackedLink: Codable, Identifiable {
    let id: String
    let slug: String
    let label: String
    let platform: String?
    let contentUrl: String?
    let clicks: Int
    let signups: Int
    var shareURL: URL? { URL(string: "https://minervaflow.app/r/\(slug)") }
}

struct FlowAmbassadorRestaurantProfile: Codable, Identifiable {
    let id: String
    let name: String
    let city: String?
    let quote: String?
}

struct FlowAmbassadorUgcSubmission: Codable, Identifiable {
    let id: String
    let platform: String
    let postUrl: String
    let caption: String
    let status: String
    let reviewNote: String?
    let createdAt: String
    let restaurantName: String
}

struct FlowAmbassadorDashboard: Codable {
    let summary: FlowAmbassadorSummary?
    let payoutsEnabled: Bool
    let shareUrl: String?
    let profiles: [FlowAmbassadorRestaurantProfile]
    let submissions: [FlowAmbassadorUgcSubmission]
}

struct LoyaltyReward: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let pointsCost: Int
    /// Set when the owner linked this reward to a specific dish
    /// (reward_menu_item_link). Just the id — menu_items has no
    /// customer-facing RLS SELECT policy at all (menu reads only ever go
    /// through the admin-bridged /api/portal/menu route, see
    /// SupabaseManager.fetchMenu()), so a direct embedded join from the
    /// customer's own token silently returns null for this relation.
    /// RewardDetailView resolves this id against the already-fetched
    /// supabase.menuItems instead.
    let menuItemId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case pointsCost = "points_cost"
        case menuItemId = "menu_item_id"
    }
}

struct Offer: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let imageUrl: String?
    let price: Double?
    let includedItems: [String]
    let excludedItems: [String]
    let active: Bool
    let isBirthdaySpecial: Bool
    let startsAt: Date?
    let endsAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case imageUrl = "image_url"
        case price
        case includedItems = "included_items"
        case excludedItems = "excluded_items"
        case active
        case isBirthdaySpecial = "is_birthday_special"
        case startsAt = "starts_at"
        case endsAt = "ends_at"
    }

    var isLive: Bool {
        guard active else { return false }
        let now = Date()
        if let startsAt, startsAt > now { return false }
        if let endsAt, endsAt < now { return false }
        return true
    }
}

enum BirthdayOfferEligibility {
    /// Customer birthdays arrive from Postgres as YYYY-MM-DD. Compare the
    /// calendar month/day locally so UTC conversion cannot shift the day.
    static func isBirthdayToday(_ birthday: String?, today: Date = Date(), calendar: Calendar = .current) -> Bool {
        guard let birthday else { return false }
        let parts = birthday.split(separator: "-", omittingEmptySubsequences: false)
        guard parts.count == 3,
              parts[0].count == 4,
              let birthYear = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2]),
              (1...12).contains(month)
        else { return false }

        let maxDay: Int
        switch month {
        case 2: maxDay = isLeapYear(birthYear) ? 29 : 28
        case 4, 6, 9, 11: maxDay = 30
        default: maxDay = 31
        }
        guard (1...maxDay).contains(day) else { return false }

        let todayParts = calendar.dateComponents([.month, .day, .year], from: today)
        guard let todayMonth = todayParts.month, let todayDay = todayParts.day else { return false }
        if month == 2, day == 29, !isLeapYear(todayParts.year ?? 0) {
            // Leap-day birthdays are celebrated on February 28 in non-leap years.
            return todayMonth == 2 && todayDay == 28
        }
        return todayMonth == month && todayDay == day
    }

    private static func isLeapYear(_ year: Int) -> Bool {
        year.isMultiple(of: 400) || (year.isMultiple(of: 4) && !year.isMultiple(of: 100))
    }
}

struct NativeMenuPriceOption: Codable, Identifiable, Hashable {
    let id: String
    var label: String
    var quantity: Int
    var price: Double
}

struct NativeCartLine: Identifiable {
    let key: String
    let item: NativeMenuItem
    let option: NativeMenuPriceOption?
    let quantity: Int

    var id: String { key }
    var unitPrice: Double { option?.price ?? item.price }
    var displayName: String { option.map { "\(item.name) · \($0.label)" } ?? item.name }
    var total: Double { unitPrice * Double(quantity) }
}

func nativeMenuCartKey(menuItemId: String, priceOptionId: String? = nil) -> String {
    guard let priceOptionId, !priceOptionId.isEmpty else { return menuItemId }
    return "\(menuItemId)::\(priceOptionId)"
}

func resolveNativeCustomerCart(_ cart: [String: Int], items: [NativeMenuItem]) -> [NativeCartLine]? {
    var lines: [NativeCartLine] = []
    for (key, quantity) in cart.sorted(by: { $0.key < $1.key }) {
        if quantity == 0 { continue }
        let parts = key.components(separatedBy: "::")
        guard parts.count <= 2, (1...99).contains(quantity),
              let item = items.first(where: { $0.id == parts[0] && $0.active && $0.isDraft != true && $0.isOrderable != false }) else { return nil }
        let options = item.priceOptions ?? []
        let option = parts.count == 2 ? options.first(where: { $0.id == parts[1] }) : nil
        guard options.isEmpty == (option == nil), parts.count == 1 || option != nil else { return nil }
        let price = option?.price ?? item.price
        guard price.isFinite, price > 0 else { return nil }
        lines.append(NativeCartLine(key: key, item: item, option: option, quantity: quantity))
    }
    return lines
}

struct NativeMenuItem: Codable, Identifiable {
    let id: String
    let restaurantId: String
    let name: String
    let category: String?
    let price: Double
    let description: String?
    let active: Bool
    let imageUrl: String?
    let imageUrls: [String]
    var isDraft: Bool? = nil
    var allergens: [String]? = nil
    var allergensConfirmed: Bool? = nil
    var priceOptions: [NativeMenuPriceOption]? = nil
    var isOrderable: Bool? = nil

    /// Every photo available for the carousel — the single legacy
    /// image_url first (if it isn't already duplicated in image_urls),
    /// then the rest, so an item that only ever had the old single-image
    /// field still shows something instead of an empty carousel.
    var galleryImageURLs: [String] {
        var urls = imageUrls
        if let imageUrl, !urls.contains(imageUrl) {
            urls.insert(imageUrl, at: 0)
        }
        return urls
    }

    enum CodingKeys: String, CodingKey {
        case id
        case restaurantId = "restaurant_id"
        case name, category, price, description, active, allergens
        case isDraft = "is_draft"
        case allergensConfirmed = "allergens_confirmed"
        case priceOptions = "price_options"
        case isOrderable = "is_orderable"
        case imageUrl = "image_url"
        case imageUrls = "image_urls"
    }
}

extension NativeMenuItem {
    private enum BridgeKeys: String, CodingKey {
        case restaurantId, imageUrl, imageUrls, isDraft, allergensConfirmed, priceOptions, isOrderable
    }
    // Owner reads use PostgREST snake_case; the shared web API maps to camelCase.
    init(from decoder: Decoder) throws {
        let row = try decoder.container(keyedBy: CodingKeys.self)
        let bridge = try decoder.container(keyedBy: BridgeKeys.self)
        id = try row.decode(String.self, forKey: .id)
        restaurantId = try bridge.decodeIfPresent(String.self, forKey: .restaurantId) ?? row.decode(String.self, forKey: .restaurantId)
        name = try row.decode(String.self, forKey: .name)
        category = try row.decodeIfPresent(String.self, forKey: .category)
        price = try row.decode(Double.self, forKey: .price)
        description = try row.decodeIfPresent(String.self, forKey: .description)
        active = try row.decode(Bool.self, forKey: .active)
        imageUrl = try bridge.decodeIfPresent(String.self, forKey: .imageUrl) ?? row.decodeIfPresent(String.self, forKey: .imageUrl)
        imageUrls = try bridge.decodeIfPresent([String].self, forKey: .imageUrls) ?? row.decodeIfPresent([String].self, forKey: .imageUrls) ?? []
        isDraft = try bridge.decodeIfPresent(Bool.self, forKey: .isDraft) ?? row.decodeIfPresent(Bool.self, forKey: .isDraft)
        allergens = try row.decodeIfPresent([String].self, forKey: .allergens)
        allergensConfirmed = try bridge.decodeIfPresent(Bool.self, forKey: .allergensConfirmed) ?? row.decodeIfPresent(Bool.self, forKey: .allergensConfirmed)
        priceOptions = try bridge.decodeIfPresent([NativeMenuPriceOption].self, forKey: .priceOptions) ?? row.decodeIfPresent([NativeMenuPriceOption].self, forKey: .priceOptions)
        isOrderable = try bridge.decodeIfPresent(Bool.self, forKey: .isOrderable) ?? row.decodeIfPresent(Bool.self, forKey: .isOrderable)
    }
}

struct MenuResponse: Codable {
    let items: [NativeMenuItem]
    let taxRate: Double
    let acceptsTips: Bool
    let onlinePaymentEnabled: Bool
    let canPayAtReceipt: Bool?
    let canPayOnline: Bool?
    let pickupEnabled: Bool?
    let deliveryEnabled: Bool
}

struct PortalDeliveryQuote: Codable {
    let distanceKm: Double?
    let fee: Double
    let etaMinutes: Int?
    let available: Bool
    let reason: String?
}

struct MenuItemReview: Codable, Identifiable {
    let id: String
    let menuItemId: String
    let customerId: String
    let rating: Int
    let comment: String?
    let imageUrls: [String]
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case menuItemId = "menu_item_id"
        case customerId = "customer_id"
        case rating, comment
        case imageUrls = "image_urls"
        case createdAt = "created_at"
    }
}

/// A whole-restaurant review — distinct from MenuItemReview (which rates a
/// single dish), matching the "avis Google Maps" expectation for the
/// overall experience. Up to 6 photos, enforced by the DB constraint too.
struct RestaurantReview: Codable, Identifiable {
    let id: String
    let restaurantId: String
    let customerId: String
    let rating: Int
    let comment: String?
    let imageUrls: [String]
    let createdAt: Date
    /// "private" (rating < 4) reviews are only ever returned by RLS to
    /// their own author or restaurant staff — see 0098's visibility
    /// policy — so this is always "public" in lists other customers see.
    let visibility: String
    let ownerResponse: String?
    let ownerRespondedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case restaurantId = "restaurant_id"
        case customerId = "customer_id"
        case rating, comment
        case imageUrls = "image_urls"
        case createdAt = "created_at"
        case visibility
        case ownerResponse = "owner_response"
        case ownerRespondedAt = "owner_responded_at"
    }
}

struct OfferReview: Codable, Identifiable {
    let id: String
    let offerId: String
    let restaurantId: String
    let customerId: String
    let rating: Int
    let comment: String?
    let imageUrls: [String]
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case offerId = "offer_id"
        case restaurantId = "restaurant_id"
        case customerId = "customer_id"
        case rating, comment
        case imageUrls = "image_urls"
        case createdAt = "created_at"
    }
}

struct DiscoverRestaurant: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let address: String?
    let city: String?
    let province: String?
    let lat: Double
    let lng: Double
    let phone: String?
    let website: String?
    let color: String?
    let serviceModel: String?
    let imageUrls: [String]
    let googleMapsUrl: String?
    let workspaceLogoUrl: String?
}

struct DiscoverRestaurantDetail: Codable {
    let id: String
    let name: String
    let description: String?
    let address: String?
    let city: String?
    let province: String?
    let lat: Double?
    let lng: Double?
    let phone: String?
    let website: String?
    let color: String?
    let serviceModel: String?
    let imageUrls: [String]
    let googleMapsUrl: String?
}

struct RestaurantDiscoverOffer: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let imageUrl: String?
    let price: Double?
    let includedItems: [String]
    let excludedItems: [String]
    let active: Bool
}

struct DiscoverRestaurantResponse: Codable {
    let restaurant: DiscoverRestaurantDetail
    let offers: [RestaurantDiscoverOffer]
    let menuItems: [NativeMenuItem]
    let branding: NativeTenantBranding?
}

struct DiscoverListResponse: Codable {
    let restaurants: [DiscoverRestaurant]
}

/// One line of "Populaire près de vous" — ranked by real order_items
/// quantity across every discoverable restaurant (see
/// app/api/portal/popular/route.ts), not a vanity metric.
struct PopularMenuItem: Codable, Identifiable {
    let id: String
    let name: String
    let price: Double
    let imageUrl: String?
    let category: String?
    let restaurantId: String
    let restaurantName: String
    let orderCount: Int
}

struct PopularMenuItemsResponse: Codable {
    let items: [PopularMenuItem]
}

struct ReferralProgram: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let goalCount: Int
    let rewardDescription: String?
}

struct ReferralLink: Codable, Identifiable {
    let id: String
    let referralProgramId: String
    let code: String
    let convertedCount: Int
    let rewardClaimedAt: String?
}

struct ReferralProgress: Codable, Identifiable {
    let program: ReferralProgram
    let link: ReferralLink?
    var id: String { program.id }
}

struct ReferralsResponse: Codable {
    let programs: [ReferralProgress]
}

/// One restaurant loyalty relationship, with the restaurant's own name
/// attached — see app/api/portal/restaurants/route.ts for why this needs
/// a bridge (restaurants itself isn't customer-readable) rather than a
/// direct RLS-scoped fetch the way the underlying customers rows are.
struct RestaurantMembership: Codable, Identifiable {
    let customerId: String
    let restaurantId: String
    let restaurantName: String
    let visitCount: Int
    let totalSpent: Double
    let loyaltyPoints: Int
    var id: String { customerId }
}

struct RestaurantMembershipsResponse: Codable {
    let memberships: [RestaurantMembership]
}

/// One line of combined points/rewards history, annotated with which
/// restaurant it happened at — the same shape ProfileView's history and
/// MyCardView's embedded history both render, now that either can span
/// more than one restaurant relationship.
struct LoyaltyHistoryEntry: Identifiable {
    let id: String
    let title: String
    let date: Date
    let pointsDelta: Int
    let restaurantName: String?
}

struct CustomerOrderItem: Codable, Identifiable {
    let id: String
    let itemName: String
    let unitPrice: Double
    let quantity: Int
    let menuItemId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case itemName = "item_name"
        case unitPrice = "unit_price"
        case quantity
        case menuItemId = "menu_item_id"
    }
}

/// A past order as the customer themself sees it — `orders_customer_select`
/// (migration 0156) is what makes this readable at all; no bridge endpoint
/// needed since, unlike `restaurants`, this table has nothing customers
/// shouldn't see about their own rows.
struct CustomerOrder: Codable, Identifiable {
    let id: String
    let status: String
    let total: Double
    let createdAt: Date
    var items: [CustomerOrderItem]
    let estimatedReadyAt: Date?
    let cancellationReason: String?
    /// Short note the restaurant sent about this order ("About 20 min, busy tonight").
    let ownerMessage: String?

    enum CodingKeys: String, CodingKey {
        case id, status, total
        case createdAt = "created_at"
        case items = "order_items"
        case estimatedReadyAt = "estimated_ready_at"
        case cancellationReason = "cancellation_reason"
        case ownerMessage = "owner_message"
    }
}

struct NativeFlowAmbassadorFlag: Codable {
    let id: String
}

/// Mirrors lib/data/team-metrics.ts's TeamMetricsSnapshot (served by
/// /api/team/metrics, team members only).
struct NativeTeamMetrics: Codable {
    struct CountPoint: Codable, Identifiable {
        let date: String
        let count: Int
        var id: String { date }
    }
    struct RevenuePoint: Codable, Identifiable {
        let date: String
        let revenue: Double
        var id: String { date }
    }
    struct Visitors: Codable {
        let total: Int
        let deltaPct: Double?
    }
    struct FunnelStage: Codable, Identifiable {
        let key: String
        let label: String
        let count: Int
        let conversionFromPrevious: Double?
        var id: String { key }
    }
    struct Funnel: Codable {
        let stages: [FunnelStage]
        let demosExcluded: Int
    }
    struct FocusAction: Codable, Identifiable {
        let title: String
        let reason: String
        var id: String { title }
    }
    struct Focus: Codable {
        let metric: String // "activated_restaurants" | "mrr"
        let label: String
        let actual: Double
        let target: Double?
        let actions: [FocusAction]
    }
    let totalRestaurants: Int
    let newRestaurantsThisMonth: Int
    let newRestaurantsDeltaPct: Double?
    let activeSubscriptions: Int
    let mrr: Double
    let mrrDeltaPct: Double?
    let churnedThisMonth: Int
    let churnRatePct: Double?
    let restaurantsJoinedSeries: [CountPoint]
    let mrrSeries: [RevenuePoint]
    /// nil until POSTHOG_PERSONAL_API_KEY is configured server-side.
    let visitors: Visitors?
    /// Optional so an app newer than the deployed server still decodes the rest.
    let funnel: Funnel?
    let focus: Focus?
}

/// Mirrors lib/data/team-academy.ts (served by /api/team/academy; teamOnly
/// sections are already filtered out server-side for ambassadors).
struct NativeAcademyResponse: Codable {
    let pages: [NativeAcademyPage]
}

struct NativeAcademyPage: Codable, Identifiable {
    let slug: String
    let title: String
    let description: String
    let sections: [NativeAcademySection]
    var id: String { slug }
}

struct NativeAcademySection: Codable, Identifiable {
    struct Item: Codable, Identifiable {
        let text: String
        let tag: String?
        var id: String { text }
    }
    struct Note: Codable {
        let tone: String
        let text: String
    }
    let id: String
    let title: String
    let intro: String?
    let items: [Item]?
    let note: Note?
    let teamOnly: Bool?
}

/// Mirrors lib/data/team-goals.ts GoalsSnapshot (/api/team/goals, team only).
struct NativeTeamGoals: Codable {
    struct Row: Codable, Identifiable {
        let metric: String
        let label: String
        let unit: String
        let actual: Double?
        let target: Double?
        var id: String { metric }
    }
    let month: String
    let elapsedPct: Double
    let rows: [Row]
}

/// Mirrors lib/team/contributions.ts Heatmap (26 Monday-first weeks).
struct NativeHeatmapDay: Codable, Identifiable {
    let date: String
    let count: Int
    let level: Int
    let future: Bool
    let bySource: [String: Int]
    var id: String { date }
}

struct NativeHeatmap: Codable {
    let weeks: Int
    let days: [NativeHeatmapDay]
    let total: Int
    let bySource: [String: Int]
}

/// Mirrors lib/data/team-members.ts (/api/team/members, team only).
struct NativeMemberSummary: Codable, Identifiable {
    let id: String
    let name: String
    let initials: String
    let isTeamMember: Bool
    let githubLogin: String?
    let githubStatus: String // "ok" | "unavailable" | "not_linked"
    let heatmap: NativeHeatmap
}

struct NativeMemberDirectory: Codable {
    let members: [NativeMemberSummary]
    let currentUserId: String
}

struct NativeMemberProfile: Codable, Identifiable {
    struct ContentLink: Codable, Identifiable {
        let id: String
        let url: String
        let platform: String
        let title: String
        let publishedOn: String
    }
    struct Checkin: Codable, Identifiable {
        let weekStart: String
        let commitments: String
        let delivered: String
        var id: String { weekStart }
    }
    let id: String
    let name: String
    let initials: String
    let isTeamMember: Bool
    let githubLogin: String?
    let githubStatus: String
    let heatmap: NativeHeatmap
    let isSelf: Bool
    let contentLinks: [ContentLink]
    let checkins: [Checkin]
}

/// A physical touchpoint (NFC tag / QR sticker / chevalet) created on the web
/// "Points de contact" screen; the owner's RLS session can read its own rows.
struct NativeOwnerTouchpoint: Codable, Identifiable {
    let id: String
    let label: String
    let type: String
    let code: String
    let destinationKind: String

    enum CodingKeys: String, CodingKey {
        case id, label, type, code
        case destinationKind = "destination_kind"
    }
}

struct RewardRedemption: Codable, Identifiable {
    let id: String
    let restaurantId: String
    let rewardName: String
    let pointsSpent: Int
    let code: String
    let status: String // "pending" | "claimed"
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case restaurantId = "restaurant_id"
        case rewardName = "reward_name"
        case pointsSpent = "points_spent"
        case code
        case status
        case createdAt = "created_at"
    }
}

struct LoyaltyTransaction: Codable, Identifiable {
    let id: String
    let restaurantId: String
    let type: String
    let pointsDelta: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case restaurantId = "restaurant_id"
        case type
        case pointsDelta = "points_delta"
        case createdAt = "created_at"
    }
}

/// Mirrors lib/loyalty-tiers.ts exactly — same thresholds, same three tiers,
/// same "vient de rejoindre / dépense notable / candidat ambassadeur"
/// progression, so a customer sees an identical status whether they're on
/// the web portal or this app.
enum LoyaltyTier: String {
    case habitue, privilegie, ambassadeur

    var label: String {
        switch self {
        case .habitue: return "Habitué"
        case .privilegie: return "Privilégié"
        case .ambassadeur: return "Ambassadeur"
        }
    }

    var systemImage: String {
        switch self {
        case .habitue: return "leaf"
        case .privilegie: return "star.fill"
        case .ambassadeur: return "crown.fill"
        }
    }

    /// Solid full-width banner colors, matching the web's walletTierBg and
    /// the Starbucks reference's Green/Gold-status-banner pattern — the
    /// whole banner recolors per tier rather than a neutral card with a
    /// colored badge.
    var bannerColor: Color {
        switch self {
        case .habitue: return MinervaColor.emerald
        case .privilegie: return MinervaColor.emeraldDark
        case .ambassadeur: return MinervaColor.emeraldDeep
        }
    }

    var bannerForeground: Color { .white }

    static func resolve(totalSpent: Double, tier2: Double = 150, tier3: Double = 400) -> LoyaltyTier {
        if totalSpent >= tier3 { return .ambassadeur }
        if totalSpent >= tier2 { return .privilegie }
        return .habitue
    }
}

struct PlatformAnnouncement: Codable, Identifiable {
    let id: String
    let title: String
    let body: String
    let badgeLabel: String?
    let category: String?
    let callToActionLabel: String?
    let callToActionUrl: String?
    let pollQuestion: String?
    let pollOptions: [String]?
    let isActive: Bool?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case body
        case badgeLabel = "badge_label"
        case category
        case callToActionLabel = "call_to_action_label"
        case callToActionUrl = "call_to_action_url"
        case pollQuestion = "poll_question"
        case pollOptions = "poll_options"
        case isActive = "is_active"
        case createdAt = "created_at"
    }
}

/// The favourites a customer saved at one establishment ("Mes favoris" shows
/// one card per establishment).
struct EstablishmentFavorites: Identifiable {
    let id: String
    let name: String
    let items: [NativeMenuItem]
    let offers: [Offer]
    /// How many favourites are saved there, even if their details could not be loaded.
    let savedCount: Int
    let isHome: Bool
    let loadFailed: Bool
}

/// Points credited by `claim_app_install_bonus()` the first time the app is
/// opened at a restaurant that enabled the install bonus.
struct AppBonusAward: Decodable, Identifiable {
    let restaurantId: String
    let restaurantName: String
    let points: Int
    var id: String { restaurantId }

    enum CodingKeys: String, CodingKey {
        case restaurantId = "restaurant_id", restaurantName = "restaurant_name", points
    }
}

struct NativeOwnerOrderLine: Codable, Identifiable {
    let id: String
    let itemName: String
    let unitPrice: Double
    let quantity: Int
    let notes: String?
    enum CodingKeys: String, CodingKey {
        case id, quantity, notes
        case itemName = "item_name"
        case unitPrice = "unit_price"
    }
}

struct NativeOwnerOrderDetail: Codable {
    let guestPhone: String?
    let notes: String?
    let paymentStatus: String?
    let fulfillmentMode: String?
    let subtotal: Double
    let taxAmount: Double
    let tipAmount: Double
    let total: Double
    let deliveryAddress: String?
    let ownerMessage: String?
    let items: [NativeOwnerOrderLine]
    enum CodingKeys: String, CodingKey {
        case notes, subtotal, total
        case ownerMessage = "owner_message"
        case guestPhone = "guest_phone"
        case paymentStatus = "payment_status"
        case fulfillmentMode = "fulfillment_mode"
        case taxAmount = "tax_amount"
        case tipAmount = "tip_amount"
        case deliveryAddress = "delivery_address"
        case items = "order_items"
    }
}

/// Full customer page for the owner: totals, contact, loyalty activity and recent orders.
struct OwnerCustomerProfile: Decodable, Identifiable {
    struct LoyaltyEntry: Decodable, Identifiable {
        let id: String
        let type: String
        let amountSpent: Double?
        let pointsDelta: Int
        let note: String?
        let createdAt: String
        enum CodingKeys: String, CodingKey {
            case id, type, note
            case amountSpent = "amount_spent", pointsDelta = "points_delta", createdAt = "created_at"
        }
    }
    struct OrderEntry: Decodable, Identifiable {
        struct Line: Decodable { let itemName: String; let quantity: Int
            enum CodingKeys: String, CodingKey { case itemName = "item_name", quantity } }
        let id: String
        let status: String
        let total: Double
        let createdAt: String
        let items: [Line]
        enum CodingKeys: String, CodingKey { case id, status, total, createdAt = "created_at", items = "order_items" }
    }

    let id: String
    let name: String
    let email: String?
    let phone: String?
    let loyaltyPoints: Int
    let visitCount: Int
    let totalSpent: Double
    let lastVisitAt: String?
    let createdAt: String
    let birthday: String?
    let city: String?
    let marketingConsent: Bool?
    let loyalty: [LoyaltyEntry]
    let orders: [OrderEntry]

    enum CodingKeys: String, CodingKey {
        case id, name, email, phone, birthday, city, orders
        case loyaltyPoints = "loyalty_points", visitCount = "visit_count", totalSpent = "total_spent"
        case lastVisitAt = "last_visit_at", createdAt = "created_at", marketingConsent = "marketing_consent"
        case loyalty = "loyalty_transactions"
    }

    /// Dishes this customer orders most (from their recent orders).
    var favoriteItems: [(name: String, quantity: Int)] {
        var counts: [String: Int] = [:]
        for order in orders where order.status != "annulee" { for line in order.items { counts[line.itemName, default: 0] += line.quantity } }
        return counts.sorted { $0.value > $1.value }.prefix(3).map { ($0.key, $0.value) }
    }
}

/// A team member's full page for the owner: contact, notes and upcoming shifts.
struct OwnerEmployeeProfile: Decodable, Identifiable {
    struct Shift: Decodable, Identifiable {
        let id: String
        let shiftDate: String
        let startTime: String
        let endTime: String
        let positionLabel: String?
        let status: String?
        enum CodingKeys: String, CodingKey {
            case id, status
            case shiftDate = "shift_date", startTime = "start_time", endTime = "end_time", positionLabel = "position_label"
        }

        /// Length in hours; a shift ending before it starts is overnight.
        var hours: Double {
            func minutes(_ value: String) -> Double? {
                let parts = value.split(separator: ":")
                guard parts.count >= 2, let h = Double(parts[0]), let m = Double(parts[1]) else { return nil }
                return h * 60 + m
            }
            guard let start = minutes(startTime), let end = minutes(endTime) else { return 0 }
            return (end >= start ? end - start : end + 1440 - start) / 60
        }
        var date: Date? {
            let formatter = DateFormatter()
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateFormat = "yyyy-MM-dd"
            return formatter.date(from: String(shiftDate.prefix(10)))
        }
        var timeRange: String { "\(startTime.prefix(5))–\(endTime.prefix(5))" }
    }

    let id: String
    let fullName: String
    let roleTitle: String
    let hourlyWage: Double?
    let active: Bool
    let description: String?
    let contactPhone: String?
    let contactEmail: String?
    let shifts: [Shift]

    enum CodingKeys: String, CodingKey {
        case id, active, description
        case fullName = "full_name", roleTitle = "role_title", hourlyWage = "hourly_wage"
        case contactPhone = "contact_phone", contactEmail = "contact_email"
        case shifts = "shift_schedules"
    }
}

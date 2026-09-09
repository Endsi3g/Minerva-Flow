import Foundation
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
    let favoriteOfferIds: [String]

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
    }
}

struct LoyaltyReward: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let pointsCost: Int

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case pointsCost = "points_cost"
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
        case restaurantId
        case name, category, price, description, active
        case imageUrl
        case imageUrls
    }
}

struct MenuResponse: Codable {
    let items: [NativeMenuItem]
    let taxRate: Double
    let acceptsTips: Bool
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
        case .ambassadeur: return MinervaColor.limeAccent
        }
    }

    var bannerForeground: Color {
        switch self {
        case .ambassadeur: return MinervaColor.emeraldDark
        default: return .white
        }
    }

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


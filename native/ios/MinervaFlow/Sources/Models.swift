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
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case menuItemId = "menu_item_id"
        case customerId = "customer_id"
        case rating, comment
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

struct RewardRedemption: Codable, Identifiable {
    let id: String
    let rewardName: String
    let pointsSpent: Int
    let code: String
    let status: String // "pending" | "claimed"
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case rewardName = "reward_name"
        case pointsSpent = "points_spent"
        case code
        case status
        case createdAt = "created_at"
    }
}

struct LoyaltyTransaction: Codable, Identifiable {
    let id: String
    let type: String
    let pointsDelta: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
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

import Foundation
import SwiftUI

struct Customer: Codable, Identifiable {
    let id: String
    let restaurantId: String
    let name: String
    let visitCount: Int
    let totalSpent: Double
    let loyaltyPoints: Int
    let notificationFrequency: String
    let favoriteOfferIds: [String]

    enum CodingKeys: String, CodingKey {
        case id
        case restaurantId = "restaurant_id"
        case name
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
    let active: Bool
    let startsAt: Date?
    let endsAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
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
        case .habitue: return MinervaColor.ink
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

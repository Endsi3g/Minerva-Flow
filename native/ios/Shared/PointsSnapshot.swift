import Foundation

/// The only data a home-screen widget actually needs — written by the
/// main app (SupabaseManager, right after a successful loadPortalData)
/// into the shared App Group container, read by the widget's
/// TimelineProvider. Widgets can't make their own network calls on a
/// useful budget, so this is deliberately last-known-good data, not live:
/// same tradeoff as any lock-screen complication.
struct PointsSnapshot: Codable {
    let customerName: String
    let restaurantName: String
    let points: Int
    let tierLabel: String
    let tierColorHex: String
    /// True for a bright background (the Ambassadeur/lime tier) — the
    /// widget needs dark text there instead of the white it uses on every
    /// other (dark) tier background.
    let tierIsLight: Bool
    /// 0...1 toward the next tier, nil at the top tier (Ambassadeur) —
    /// same calc as MyCardView's own progress bar. Only the large widget
    /// uses this; small/medium never needed it.
    let nextTierProgress: Double?
    /// Cheapest active reward, for the large widget's "prochaine
    /// récompense" row — nil when the restaurant has no active rewards,
    /// same empty-state the app itself already handles honestly.
    let nextRewardName: String?
    let nextRewardPointsCost: Int?
    /// Up to 2 active offer titles — the large widget has room for a
    /// couple, not the whole list.
    let activeOfferTitles: [String]
    let updatedAt: Date

    static let appGroupID = "group.com.minervaflow.loyalty"
    private static let storageKey = "pointsSnapshot"

    static func load() -> PointsSnapshot? {
        guard let defaults = UserDefaults(suiteName: appGroupID),
              let data = defaults.data(forKey: storageKey) else { return nil }
        return try? JSONDecoder().decode(PointsSnapshot.self, from: data)
    }

    func save() {
        guard let defaults = UserDefaults(suiteName: Self.appGroupID),
              let data = try? JSONEncoder().encode(self) else { return }
        defaults.set(data, forKey: Self.storageKey)
    }
}

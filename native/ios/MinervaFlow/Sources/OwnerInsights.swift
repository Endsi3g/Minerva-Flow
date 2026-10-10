import SwiftUI

/// Data behind the owner home (Aperçu). One RPC (`owner_overview_insights`,
/// migration 0187) returns the daily sales series, busiest hours, best sellers
/// and the week's loyalty activity, so the screen loads in a single round trip.
struct OwnerDailySales: Identifiable, Equatable {
    let day: Date
    let revenue: Double
    let orders: Int
    var id: Date { day }
}

struct OwnerInsights: Decodable, Equatable {
    struct Hour: Decodable, Equatable { let hour: Int; let orders: Int }
    struct Item: Decodable, Identifiable, Equatable {
        let name: String
        let quantity: Int
        var id: String { name }
    }
    struct Week: Decodable, Equatable {
        let newCustomers: Int
        let creditedVisits: Int
        let redemptions: Int
        let reviewAvg: Double?
        let reviewCount: Int
        let members: Int
        let returningPct: Int?
        enum CodingKeys: String, CodingKey {
            case newCustomers = "new_customers", creditedVisits = "credited_visits", redemptions
            case reviewAvg = "review_avg", reviewCount = "review_count", members, returningPct = "returning_pct"
        }
    }

    let daily: [OwnerDailySales]
    let hourly: [Hour]
    let topItems: [Item]
    let week: Week

    enum CodingKeys: String, CodingKey { case daily, hourly, topItems = "top_items", week }
    private struct RawDay: Decodable { let day: String; let revenue: Double; let orders: Int }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let raw = try container.decode([RawDay].self, forKey: .daily)
        daily = raw.compactMap { entry in
            OwnerInsights.dayFormatter.date(from: entry.day).map { OwnerDailySales(day: $0, revenue: entry.revenue, orders: entry.orders) }
        }
        hourly = try container.decode([Hour].self, forKey: .hourly)
        topItems = try container.decode([Item].self, forKey: .topItems)
        week = try container.decode(Week.self, forKey: .week)
    }

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

@MainActor
final class OwnerInsightsStore: ObservableObject {
    @Published private(set) var insights: OwnerInsights?
    @Published private(set) var firstName: String?
    @Published private(set) var failed = false

    private struct Params: Encodable { let p_restaurant_id: String; let p_days: Int }
    private struct ProfileName: Decodable {
        let fullName: String?
        enum CodingKeys: String, CodingKey { case fullName = "full_name" }
    }

    func load(_ supabase: SupabaseManager) async {
        await loadName(supabase)
        guard let restaurantId = supabase.selectedOwnerRestaurantId else { return }
        do {
            let value: OwnerInsights = try await supabase.client
                .rpc("owner_overview_insights", params: Params(p_restaurant_id: restaurantId, p_days: 60))
                .execute().value
            guard restaurantId == supabase.selectedOwnerRestaurantId else { return }
            insights = value
            failed = false
        } catch {
            AppLog.failure("ownerOverviewInsights", error)
            failed = insights == nil
        }
    }

    private func loadName(_ supabase: SupabaseManager) async {
        guard firstName == nil, let userId = supabase.authUserID else { return }
        let rows: [ProfileName]? = try? await supabase.client.from("profiles").select("full_name")
            .eq("id", value: userId.uuidString).limit(1).execute().value
        let full = rows?.first?.fullName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        firstName = full.split(separator: " ").first.map(String.init)
    }
}

/// Time windows the sales chart can show. Each compares with the window of the
/// same length right before it, so the delta is always like for like.
enum OwnerSalesRange: CaseIterable {
    case week, month30, monthToDate

    func title(_ L: Lx) -> String {
        switch self {
        case .week: return L("7 j", "7d")
        case .month30: return L("30 j", "30d")
        case .monthToDate: return L("Mois", "Month")
        }
    }

    func caption(_ L: Lx) -> String {
        switch self {
        case .week: return L("Ventes · 7 derniers jours", "Sales · last 7 days")
        case .month30: return L("Ventes · 30 derniers jours", "Sales · last 30 days")
        case .monthToDate: return L("Ventes · ce mois-ci", "Sales · this month")
        }
    }

    func previousLabel(_ L: Lx) -> String {
        switch self {
        case .week: return L("vs 7 j précédents", "vs previous 7d")
        case .month30: return L("vs 30 j précédents", "vs previous 30d")
        case .monthToDate: return L("vs période précédente", "vs previous period")
        }
    }

    func length(today: Date = Date()) -> Int {
        switch self {
        case .week: return 7
        case .month30: return 30
        case .monthToDate: return max(1, Calendar.current.component(.day, from: today))
        }
    }

    func current(in daily: [OwnerDailySales]) -> [OwnerDailySales] { Array(daily.suffix(length())) }

    func previous(in daily: [OwnerDailySales]) -> [OwnerDailySales] {
        let n = length()
        guard daily.count > n else { return [] }
        return Array(daily.dropLast(n).suffix(n))
    }
}

func ownerPercentChange(current: Double, previous: Double) -> Double? {
    guard previous > 0 else { return nil }
    return (current - previous) / previous * 100
}

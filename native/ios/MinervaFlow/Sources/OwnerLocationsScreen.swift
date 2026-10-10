import SwiftUI
import Charts

/// Tracks every address of the brand side by side: sales for the chosen
/// window with the change versus the window before, orders, members, a
/// small trend, and a tap to make that address the active one.
@MainActor
final class OwnerLocationsStore: ObservableObject {
    @Published private(set) var insights: [String: OwnerInsights] = [:]
    @Published private(set) var loading = false
    private struct Params: Encodable { let p_restaurant_id: String; let p_days: Int }

    func load(_ supabase: SupabaseManager) async {
        loading = true
        defer { loading = false }
        let ids = supabase.ownerRestaurants.map(\.id)
        var result: [String: OwnerInsights] = [:]
        await withTaskGroup(of: (String, OwnerInsights?).self) { group in
            for id in ids {
                group.addTask { [client = supabase.client] in
                    let value: OwnerInsights? = try? await client.rpc("owner_overview_insights", params: Params(p_restaurant_id: id, p_days: 60)).execute().value
                    return (id, value)
                }
            }
            for await (id, value) in group { if let value { result[id] = value } }
        }
        insights = result
    }
}

struct OwnerLocationsScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @StateObject private var store = OwnerLocationsStore()
    @State private var days = 7
    private var L: Lx { Lx(storedLanguage) }

    private func current(_ insights: OwnerInsights) -> [OwnerDailySales] { Array(insights.daily.suffix(days)) }
    private func previous(_ insights: OwnerInsights) -> [OwnerDailySales] { Array(insights.daily.dropLast(days).suffix(days)) }
    private func revenue(_ rows: [OwnerDailySales]) -> Double { rows.reduce(0) { $0 + $1.revenue } }

    private var ranked: [(restaurant: NativeOwnerRestaurant, insights: OwnerInsights?)] {
        supabase.ownerRestaurants
            .map { ($0, store.insights[$0.id]) }
            .sorted { revenue($0.1.map(current) ?? []) > revenue($1.1.map(current) ?? []) }
    }
    private var totalNow: Double { store.insights.values.reduce(0) { $0 + revenue(current($1)) } }
    private var totalBefore: Double { store.insights.values.reduce(0) { $0 + revenue(previous($1)) } }

    var body: some View {
        OwnerScreen(title: L("Emplacements", "Locations"), subtitle: L("Suivi de chaque adresse", "Every address at a glance"), showsLocationMenu: false) {
            totalCard
            ForEach(ranked, id: \.restaurant.id) { entry in card(entry.restaurant, entry.insights) }
        }
        .task { await store.load(supabase) }
        .refreshable { await store.load(supabase) }
    }

    private var totalCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(L("Toutes les adresses", "All locations")).font(.mv(size: 12.5, weight: .medium)).foregroundStyle(.white.opacity(0.85))
                Spacer()
                HStack(spacing: 2) {
                    ForEach([7, 30], id: \.self) { option in
                        Button { withAnimation(.easeInOut(duration: 0.2)) { days = option } } label: {
                            Text(L("\(option) j", "\(option)d")).font(.mv(size: 11.5, weight: .semibold))
                                .foregroundStyle(option == days ? MinervaColor.emeraldDeep : .white.opacity(0.8))
                                .padding(.horizontal, 8).frame(minHeight: 24)
                                .background(option == days ? Color.white : Color.clear, in: Capsule())
                        }.buttonStyle(.plain)
                    }
                }
                .padding(2).background(Color.white.opacity(0.12), in: Capsule())
            }
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(totalNow.cad).font(MinervaFont.display(30, weight: .semibold)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
                OwnerDeltaChip(percent: ownerPercentChange(current: totalNow, previous: totalBefore), onDark: true)
            }
            Text(L("\(supabase.ownerRestaurants.count) adresses · ventes sur \(days) jours", "\(supabase.ownerRestaurants.count) locations · sales over \(days) days"))
                .font(.mv(size: 12)).foregroundStyle(.white.opacity(0.75))
            if store.loading && store.insights.isEmpty { ProgressView().tint(.white).controlSize(.small) }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.emeraldDeep, in: RoundedRectangle(cornerRadius: 24))
    }

    private func card(_ restaurant: NativeOwnerRestaurant, _ insights: OwnerInsights?) -> some View {
        let active = restaurant.id == supabase.selectedOwnerRestaurantId
        let rows = insights.map(current) ?? []
        let sales = revenue(rows)
        let change = insights.flatMap { ownerPercentChange(current: sales, previous: revenue(previous($0))) }
        let share = totalNow > 0 ? sales / totalNow : 0
        return Button {
            Task { await supabase.selectOwnerRestaurant(restaurant.id) }
        } label: {
            OwnerCard(padding: 12) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(restaurant.name).font(.mv(size: 15, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                            if let city = restaurant.city, !city.isEmpty { Text(city).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft) }
                        }
                        Spacer()
                        if active { OwnerPill(text: L("Active", "Active"), tone: .good, icon: "checkmark") }
                    }
                    if let insights {
                        HStack(alignment: .bottom, spacing: 12) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(sales.cad).font(MinervaFont.display(22, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1).minimumScaleFactor(0.6)
                                HStack(spacing: 6) {
                                    OwnerDeltaChip(percent: change)
                                    Text(L("\(rows.reduce(0) { $0 + $1.orders }) commandes", "\(rows.reduce(0) { $0 + $1.orders }) orders")).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft)
                                }
                            }
                            Spacer(minLength: 4)
                            Chart(rows) { row in
                                LineMark(x: .value("Jour", row.day, unit: .day), y: .value("Ventes", row.revenue)).interpolationMethod(.catmullRom)
                                    .foregroundStyle(MinervaColor.emerald).lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                            }
                            .chartXAxis(.hidden).chartYAxis(.hidden)
                            .frame(width: 96, height: 38)
                            .accessibilityHidden(true)
                        }
                        GeometryReader { proxy in
                            Capsule().fill(MinervaColor.emerald.opacity(0.85)).frame(width: max(6, proxy.size.width * CGFloat(share)))
                        }
                        .frame(height: 5)
                        HStack {
                            Text(L("\(Int((share * 100).rounded())) % des ventes du réseau", "\(Int((share * 100).rounded()))% of network sales")).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkFaint)
                            Spacer()
                            Text(L("\(insights.week.members) clients fidélité", "\(insights.week.members) loyalty customers")).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkFaint)
                        }
                    } else if store.loading {
                        ProgressView().controlSize(.small)
                    } else {
                        Text(L("Chiffres indisponibles.", "Figures unavailable.")).font(.mv(size: 12.5)).foregroundStyle(MinervaColor.inkFaint)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityHint(Text(L("Rendre cette adresse active", "Make this location active")))
    }
}

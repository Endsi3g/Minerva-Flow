import SwiftUI

/// "Historique de points" — pulled out of ProfileView's single scrolling
/// page into its own pushed destination (memberships across restaurants +
/// the full earned/redeemed ledger). Behavior is unchanged from before;
/// only the presentation moved.
struct PointsHistoryView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var historyFilter: HistoryFilter = .all
    @State private var showAllHistory = false
    @State private var showDiscovery = false

    private enum HistoryFilter: String, CaseIterable {
        case all, earned, redeemed
        var label: String {
            switch self {
            case .all: return "Tous"
            case .earned: return "Gagnés"
            case .redeemed: return "Échangés"
            }
        }
    }

    private var filteredHistory: [LoyaltyHistoryEntry] {
        switch historyFilter {
        case .all: return supabase.combinedHistory
        case .earned: return supabase.combinedHistory.filter { $0.pointsDelta >= 0 }
        case .redeemed: return supabase.combinedHistory.filter { $0.pointsDelta < 0 }
        }
    }

    private static let historyPageSize = 10

    private var visibleHistory: [LoyaltyHistoryEntry] {
        showAllHistory ? filteredHistory : Array(filteredHistory.prefix(Self.historyPageSize))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                summaryRow
                membershipsSection
                historySection
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle("Historique de points")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showDiscovery) {
            RestaurantMapView()
        }
    }

    private var summaryRow: some View {
        let earned = supabase.combinedHistory.filter { $0.pointsDelta >= 0 }.reduce(0) { $0 + $1.pointsDelta }
        let redeemed = supabase.combinedHistory.filter { $0.pointsDelta < 0 }.reduce(0) { $0 + abs($1.pointsDelta) }
        return HStack(spacing: 10) {
            statTile(value: "\(earned)", label: "gagnés au total")
            statTile(value: "\(redeemed)", label: "échangés au total")
        }
    }

    private func statTile(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.system(size: 19, weight: .bold, design: .rounded))
                .foregroundStyle(MinervaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var membershipsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Mes cartes et mes points")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            if supabase.allMemberships.isEmpty {
                Text("Votre solde apparaîtra ici dès votre première adhésion.")
                    .font(.system(size: 12.5)).foregroundStyle(MinervaColor.inkSoft)
                Button {
                    showDiscovery = true
                } label: {
                    Label("Découvrir les restaurants près de vous", systemImage: "map.fill")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
                .buttonStyle(.plain)
            } else {
                ForEach(supabase.allMemberships) { membership in
                    HStack(spacing: 12) {
                        Image(systemName: "storefront.fill")
                            .foregroundStyle(MinervaColor.emeraldDark)
                            .frame(width: 22)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(membership.restaurantName).font(.system(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                            Text("\(membership.visitCount) visite\(membership.visitCount == 1 ? "" : "s") · \(currencyString(membership.totalSpent)) dépensés")
                                .font(.system(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
                        }
                        Spacer()
                        Text("\(membership.loyaltyPoints) pts")
                            .font(.system(size: 13, weight: .bold)).foregroundStyle(MinervaColor.emeraldDark)
                    }
                    .padding(12)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private func currencyString(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "CAD"
        formatter.locale = Locale(identifier: "fr_CA")
        return formatter.string(from: NSNumber(value: value)) ?? "0,00 $"
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Points et récompenses")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            Picker("Filtrer", selection: $historyFilter) {
                ForEach(HistoryFilter.allCases, id: \.self) { filter in
                    Text(filter.label).tag(filter)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: historyFilter) { _, _ in showAllHistory = false }

            if supabase.combinedHistory.isEmpty {
                Text("Aucun mouvement de points pour l'instant.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(.vertical, 4)
            } else if filteredHistory.isEmpty {
                Text("Aucun résultat pour ce filtre.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(.vertical, 4)
            } else {
                VStack(spacing: 6) {
                    ForEach(visibleHistory) { entry in
                        HStack {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(entry.title)
                                    .font(.system(size: 12.5, weight: .medium))
                                    .foregroundStyle(MinervaColor.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                                HStack(spacing: 4) {
                                    Text(entry.date.formatted(date: .abbreviated, time: .omitted))
                                    if let restaurantName = entry.restaurantName {
                                        Text("· \(restaurantName)")
                                    }
                                }
                                .font(.system(size: 10.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                            }
                            Spacer(minLength: 8)
                            Text("\(entry.pointsDelta >= 0 ? "+" : "")\(entry.pointsDelta) pts")
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundStyle(entry.pointsDelta >= 0 ? MinervaColor.emeraldDark : .red)
                        }
                        .padding(12)
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }

                if filteredHistory.count > Self.historyPageSize {
                    Button {
                        showAllHistory.toggle()
                    } label: {
                        Text(showAllHistory ? "Voir moins" : "Voir plus (\(filteredHistory.count - Self.historyPageSize))")
                            .font(.system(size: 12, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .padding(.vertical, 8)
                    .foregroundStyle(MinervaColor.emeraldDark)
                }
            }
        }
    }
}

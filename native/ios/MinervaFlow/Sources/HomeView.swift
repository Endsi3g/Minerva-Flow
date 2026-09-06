import SwiftUI

struct HomeView: View {
    @EnvironmentObject var supabase: SupabaseManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let customer = supabase.customer {
                    Text("Bonjour \(customer.name)")
                        .font(MinervaFont.display(24))
                        .foregroundStyle(MinervaColor.ink)

                    walletCard(for: customer)

                    if !supabase.transactions.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Historique récent")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(MinervaColor.ink)

                            ForEach(supabase.transactions.prefix(5)) { tx in
                                HStack {
                                    Text(label(for: tx.type))
                                        .font(.system(size: 13))
                                        .foregroundStyle(MinervaColor.ink)
                                    Spacer()
                                    Text("\(tx.pointsDelta >= 0 ? "+" : "")\(tx.pointsDelta) pts")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(tx.pointsDelta >= 0 ? MinervaColor.emeraldDark : .red)
                                }
                                .padding(12)
                                .background(MinervaColor.creamSoft)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }
                } else if supabase.isLoadingData {
                    ProgressView().padding(.top, 60)
                } else {
                    Text("Aucun profil de fidélité trouvé pour ce compte.")
                        .font(.system(size: 13))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .padding(.top, 40)
                }
            }
            .padding(20)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .refreshable { await supabase.loadPortalData() }
    }

    private func walletCard(for customer: Customer) -> some View {
        let tier = LoyaltyTier.resolve(totalSpent: customer.totalSpent)
        let nextTarget: Double? = tier == .habitue ? 150 : (tier == .privilegie ? 400 : nil)
        let prevTarget: Double = tier == .ambassadeur ? 400 : (tier == .privilegie ? 150 : 0)
        let progress = nextTarget.map { min(1, max(0, (customer.totalSpent - prevTarget) / ($0 - prevTarget))) } ?? 1

        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("POINTS")
                        .font(.system(size: 10.5, weight: .semibold))
                        .tracking(1)
                        .foregroundStyle(.white.opacity(0.7))
                    Text("\(customer.loyaltyPoints)")
                        .font(MinervaFont.display(40))
                        .foregroundStyle(.white)
                }
                Spacer()
                HStack(spacing: 5) {
                    Image(systemName: tier.systemImage)
                    Text(tier.label)
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(.white.opacity(0.15))
                .clipShape(Capsule())
            }

            if let nextTarget {
                VStack(alignment: .leading, spacing: 5) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.2))
                            Capsule().fill(.white).frame(width: max(8, geo.size.width * progress))
                        }
                    }
                    .frame(height: 6)
                    Text(String(format: "%.0f $ avant le palier suivant", max(0, nextTarget - customer.totalSpent)))
                        .font(.system(size: 11.5))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }

            HStack(spacing: 16) {
                Text("\(customer.visitCount) visites")
                Text(String(format: "%.0f $ dépensés", customer.totalSpent))
            }
            .font(.system(size: 12))
            .foregroundStyle(.white.opacity(0.9))
        }
        .padding(20)
        .background(MinervaColor.ink)
        .clipShape(RoundedRectangle(cornerRadius: 22))
    }

    private func label(for type: String) -> String {
        switch type {
        case "visite": return "Visite"
        case "ajustement": return "Ajustement"
        case "echange": return "Récompense échangée"
        default: return type
        }
    }
}

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var supabase: SupabaseManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if let customer = supabase.customer {
                    header(for: customer)
                    walletCard(for: customer)
                    metricsRow(for: customer)

                    if !supabase.offers.isEmpty {
                        offersStrip
                    }

                    if !supabase.transactions.isEmpty {
                        recentActivity
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
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .refreshable { await supabase.loadPortalData() }
    }

    // MARK: - Header

    private func header(for customer: Customer) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 1) {
                Text("ESPACE CLIENT")
                    .font(.system(size: 9.5, weight: .bold))
                    .tracking(0.8)
                    .foregroundStyle(MinervaColor.emeraldDark)
                Text("Bonjour \(customer.name.split(separator: " ").first.map(String.init) ?? customer.name)")
                    .font(MinervaFont.display(21))
                    .foregroundStyle(MinervaColor.ink)
            }
            Spacer()
            if let restaurantName = supabase.restaurantName {
                Text(restaurantName)
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(MinervaColor.creamSoft)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(MinervaColor.border))
            }
        }
    }

    // MARK: - Wallet hero card

    private func walletCard(for customer: Customer) -> some View {
        let tier = LoyaltyTier.resolve(totalSpent: customer.totalSpent)
        let nextTarget: Double? = tier == .habitue ? 150 : (tier == .privilegie ? 400 : nil)
        let prevTarget: Double = tier == .ambassadeur ? 400 : (tier == .privilegie ? 150 : 0)
        let progress = nextTarget.map { min(1, max(0, (customer.totalSpent - prevTarget) / ($0 - prevTarget))) } ?? 1

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("POINTS")
                        .font(.system(size: 9.5, weight: .semibold))
                        .tracking(0.8)
                        .foregroundStyle(.white.opacity(0.7))
                    Text("\(customer.loyaltyPoints)")
                        .font(MinervaFont.display(36))
                        .foregroundStyle(.white)
                }
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: tier.systemImage)
                        .font(.system(size: 11))
                    Text(tier.label)
                        .font(.system(size: 11.5, weight: .semibold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 9)
                .padding(.vertical, 5)
                .background(.white.opacity(0.15))
                .clipShape(Capsule())
            }

            if let nextTarget {
                VStack(alignment: .leading, spacing: 4) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.2))
                            Capsule().fill(.white).frame(width: max(6, geo.size.width * progress))
                        }
                    }
                    .frame(height: 5)
                    Text(String(format: "%.0f $ avant le palier suivant", max(0, nextTarget - customer.totalSpent)))
                        .font(.system(size: 10.5))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }

            HStack(spacing: 14) {
                Label("\(customer.visitCount) visites", systemImage: "checkmark.circle")
                Label(String(format: "%.0f $ dépensés", customer.totalSpent), systemImage: "creditcard")
            }
            .font(.system(size: 11))
            .foregroundStyle(.white.opacity(0.9))
        }
        .padding(16)
        .background(MinervaColor.ink)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    // MARK: - Metrics grid

    private func metricsRow(for customer: Customer) -> some View {
        let cheapestReward = supabase.rewards.min(by: { $0.pointsCost < $1.pointsCost })
        let rewardProgress = cheapestReward.map { min(100, Double(customer.loyaltyPoints) / Double($0.pointsCost) * 100) } ?? 0
        let avgPerVisit = customer.visitCount > 0 ? customer.totalSpent / Double(customer.visitCount) : 0

        return HStack(spacing: 10) {
            metricTile(
                gauge: cheapestReward != nil,
                value: rewardProgress,
                centerValue: cheapestReward != nil ? "\(Int(rewardProgress))%" : "—",
                icon: "gift.fill",
                title: "Prochaine récompense",
                subtitle: cheapestReward.map { "\($0.name) · \($0.pointsCost) pts" } ?? "Aucune pour l'instant"
            )
            metricTile(
                gauge: false,
                value: 0,
                centerValue: String(format: "%.0f $", avgPerVisit),
                icon: "chart.bar.fill",
                title: "Dépense moyenne",
                subtitle: "par visite"
            )
        }
    }

    private func metricTile(gauge: Bool, value: Double, centerValue: String, icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: 10) {
            if gauge {
                RadialGauge(value: value, centerValue: centerValue, centerLabel: "")
            } else {
                ZStack {
                    Circle().fill(MinervaColor.emerald.opacity(0.12))
                    Text(centerValue)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
                .frame(width: 56, height: 56)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(subtitle)
                    .font(.system(size: 9.5))
                    .foregroundStyle(MinervaColor.inkFaint)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Offers

    private var offersStrip: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Offres en ce moment")
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(supabase.offers) { offer in
                        VStack(alignment: .leading, spacing: 3) {
                            Image(systemName: "tag.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(MinervaColor.emeraldDark)
                            Text(offer.title)
                                .font(.system(size: 11.5, weight: .semibold))
                                .foregroundStyle(MinervaColor.emeraldDark)
                                .lineLimit(1)
                            if let description = offer.description {
                                Text(description)
                                    .font(.system(size: 9.5))
                                    .foregroundStyle(MinervaColor.emerald)
                                    .lineLimit(2)
                            }
                        }
                        .padding(10)
                        .frame(width: 140, alignment: .leading)
                        .background(MinervaColor.emerald.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(MinervaColor.emerald.opacity(0.25)))
                    }
                }
            }
        }
    }

    // MARK: - Recent activity

    private var recentActivity: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Historique récent")
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 6) {
                ForEach(supabase.transactions.prefix(3)) { tx in
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(label(for: tx.type))
                                .font(.system(size: 12))
                                .foregroundStyle(MinervaColor.ink)
                            Text(tx.createdAt.formatted(date: .abbreviated, time: .omitted))
                                .font(.system(size: 9.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }
                        Spacer()
                        Text("\(tx.pointsDelta >= 0 ? "+" : "")\(tx.pointsDelta) pts")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(tx.pointsDelta >= 0 ? MinervaColor.emeraldDark : .red)
                    }
                    .padding(10)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
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

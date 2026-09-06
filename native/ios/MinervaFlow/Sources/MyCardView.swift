import SwiftUI

/// The full account "card" reached by tapping the points banner on Home —
/// same information Starbucks puts behind its own balance card tap: tier
/// status, full progress toward the next tier, lifetime stats, and the
/// offers tied to the account, all in one place instead of scattered
/// across tabs. This is a detail view, not a duplicate Home screen: it
/// exists so "tap my balance" actually goes somewhere, matching the
/// reference screenshot instead of being a dead tap.
struct MyCardView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                if let customer = supabase.customer {
                    VStack(spacing: 20) {
                        cardFace(for: customer)
                        statsRow(for: customer)
                        if !supabase.offers.isEmpty {
                            offersSection
                        }
                        memberSinceFooter
                    }
                    .padding(18)
                }
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Ma carte")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }

    private func cardFace(for customer: Customer) -> some View {
        let tier = LoyaltyTier.resolve(totalSpent: customer.totalSpent, tier2: supabase.loyaltyTier2Threshold, tier3: supabase.loyaltyTier3Threshold)
        let tier2 = supabase.loyaltyTier2Threshold
        let tier3 = supabase.loyaltyTier3Threshold
        let prevTarget = tier == .ambassadeur ? tier3 : tier == .privilegie ? tier2 : 0
        let nextTarget: Double? = tier == .habitue ? tier2 : tier == .privilegie ? tier3 : nil
        let progress = nextTarget.map { min(1, max(0, (customer.totalSpent - prevTarget) / ($0 - prevTarget))) }

        return VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(supabase.restaurantName ?? "Minerva Flow")
                        .font(.system(size: 11.5, weight: .semibold))
                        .opacity(0.75)
                    Text(customer.name)
                        .font(MinervaFont.display(20))
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                HStack(spacing: 5) {
                    Image(systemName: tier.systemImage)
                    Text(tier.label.uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.4)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(.white.opacity(0.18))
                .clipShape(Capsule())
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("SOLDE DE POINTS")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(0.6)
                    .opacity(0.7)
                Text("\(customer.loyaltyPoints)")
                    .font(MinervaFont.display(46))
            }

            if let progress, let nextTarget {
                VStack(alignment: .leading, spacing: 6) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.2))
                            Capsule().fill(.white).frame(width: max(geo.size.width * 0.04, geo.size.width * progress))
                        }
                    }
                    .frame(height: 7)
                    Text("\(currencyString(max(0, nextTarget - customer.totalSpent))) avant le palier suivant")
                        .font(.system(size: 11.5))
                        .opacity(0.85)
                }
            } else {
                Text("Palier maximum atteint — merci pour votre fidélité !")
                    .font(.system(size: 11.5))
                    .opacity(0.85)
            }
        }
        .foregroundStyle(tier.bannerForeground)
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tier.bannerColor)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .shadow(color: MinervaColor.ink.opacity(0.12), radius: 18, x: 0, y: 8)
    }

    private func statsRow(for customer: Customer) -> some View {
        HStack(spacing: 12) {
            statTile(icon: "checkmark.seal.fill", value: "\(customer.visitCount)", label: "Visites")
            statTile(icon: "dollarsign.circle.fill", value: currencyString(customer.totalSpent), label: "Dépensé")
            statTile(icon: "gift.fill", value: "\(supabase.redemptions.count)", label: "Échanges")
        }
    }

    private func statTile(icon: String, value: String, label: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 15))
                .foregroundStyle(MinervaColor.emerald)
            Text(value)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(MinervaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.system(size: 10.5))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var offersSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Vos offres")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ForEach(supabase.offers) { offer in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "tag.fill")
                        .font(.system(size: 12))
                        .padding(.top, 2)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(offer.title)
                            .font(.system(size: 13, weight: .semibold))
                            .fixedSize(horizontal: false, vertical: true)
                        if let description = offer.description {
                            Text(description)
                                .font(.system(size: 11.5))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .foregroundStyle(MinervaColor.emeraldDark)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(MinervaColor.emerald.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    private var memberSinceFooter: some View {
        HStack(spacing: 6) {
            Image(systemName: "sparkles")
            Text("Membre fidélité chez \(supabase.restaurantName ?? "ce restaurant")")
        }
        .font(.system(size: 11.5))
        .foregroundStyle(MinervaColor.inkFaint)
        .padding(.top, 4)
        .padding(.bottom, 12)
    }

    private func currencyString(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "CAD"
        formatter.locale = Locale(identifier: "fr_CA")
        return formatter.string(from: NSNumber(value: value)) ?? String(format: "%.2f $", value)
    }
}

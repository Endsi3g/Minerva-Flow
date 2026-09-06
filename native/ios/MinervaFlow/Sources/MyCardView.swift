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
                        tierBenefitsSection(for: tier(for: customer))
                        checkoutCodeSection(for: customer)
                        if !supabase.combinedHistory.isEmpty {
                            historySection
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

    private func tier(for customer: Customer) -> LoyaltyTier {
        LoyaltyTier.resolve(totalSpent: customer.totalSpent, tier2: supabase.loyaltyTier2Threshold, tier3: supabase.loyaltyTier3Threshold)
    }

    private func cardFace(for customer: Customer) -> some View {
        let tier = tier(for: customer)
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

    /// Names whichever restaurant this account has actually visited the
    /// most, across every membership — not just the single restaurant
    /// currently loaded, which stopped being the same thing the moment an
    /// account joined a second restaurant.
    private var memberSinceFooter: some View {
        let mostVisitedName = supabase.mostVisitedMembership?.restaurantName ?? supabase.restaurantName ?? "ce restaurant"
        return HStack(spacing: 6) {
            Image(systemName: "sparkles")
            Text("Membre fidèle chez \(mostVisitedName)")
        }
        .font(.system(size: 11.5))
        .foregroundStyle(MinervaColor.inkFaint)
        .padding(.top, 4)
        .padding(.bottom, 12)
    }

    // MARK: - Tier benefits

    private func tierBenefitsSection(for tier: LoyaltyTier) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Avantages \(tier.label.lowercased())")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 0) {
                ForEach(Array(benefits(for: tier).enumerated()), id: \.offset) { index, benefit in
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 13))
                            .foregroundStyle(MinervaColor.emeraldDark)
                            .padding(.top, 1)
                        Text(benefit)
                            .font(.system(size: 12.5))
                            .foregroundStyle(MinervaColor.ink)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(12)
                    if index < benefits(for: tier).count - 1 {
                        Divider().padding(.leading, 34)
                    }
                }
            }
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    /// Generic per-tier descriptions of the app's own real mechanics
    /// (earning/redeeming) — no restaurant-configurable benefits model
    /// exists yet, so these describe what's actually true for every
    /// restaurant rather than inventing per-restaurant perks nobody has
    /// configured.
    private func benefits(for tier: LoyaltyTier) -> [String] {
        switch tier {
        case .habitue:
            return [
                "Cumulez des points à chaque visite",
                "Accès au catalogue de récompenses de votre restaurant",
            ]
        case .privilegie:
            return [
                "Tout ce qu'Habitué offre",
                "Accès prioritaire aux offres à durée limitée",
                "Reconnu comme client régulier par votre restaurant",
            ]
        case .ambassadeur:
            return [
                "Tout ce que Privilégié offre",
                "Palier le plus élevé — un statut que votre restaurant peut reconnaître en personne",
                "Votre fidélité compte parmi les plus engagées du programme",
            ]
        }
    }

    // MARK: - Checkout code

    /// A scannable, stable identifier for this account — the display half
    /// of "show this at checkout" (same QR generation already used for
    /// referral links). Actually awarding points from a staff-side scan is
    /// a separate, not-yet-built feature (today staff record visits
    /// manually on the web dashboard) — this deliberately doesn't imply
    /// that works yet.
    private func checkoutCodeSection(for customer: Customer) -> some View {
        VStack(spacing: 10) {
            Text("Mon code fidélité")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
                .frame(maxWidth: .infinity, alignment: .leading)

            if let qrImage = QRCodeGenerator.image(for: URL(string: "https://minervaflow.app/c/\(customer.id)")!) {
                Image(uiImage: qrImage)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 160, height: 160)
                    .padding(14)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border, lineWidth: 1))
            }

            Text("Montrez ce code au personnel à la caisse.")
                .font(.system(size: 11))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Combined history

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Historique récent")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 6) {
                ForEach(supabase.combinedHistory.prefix(5)) { entry in
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
        }
    }

    private func currencyString(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "CAD"
        formatter.locale = Locale(identifier: "fr_CA")
        return formatter.string(from: NSNumber(value: value)) ?? String(format: "%.2f $", value)
    }
}

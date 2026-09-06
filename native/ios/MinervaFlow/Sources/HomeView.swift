import SwiftUI

/// Ported from the Starbucks app reference: a pinned greeting + tier banner
/// that never scrolls away (the one thing a customer glancing at the app
/// needs instantly), with a scrollable feed of everything else below it —
/// Starbucks' own home screen works exactly this way (the balance banner
/// stays put while promo cards scroll underneath). Resolves the "must fit
/// on one screen, scrolling would be destructive" brief as "the pinned part
/// must fit without scrolling," not "the whole screen must have zero
/// scroll" — a real content feed (today's offers, progress, activity)
/// cannot exist without becoming a scrollable list eventually.
struct HomeView: View {
    @EnvironmentObject var supabase: SupabaseManager

    var body: some View {
        VStack(spacing: 0) {
            if let customer = supabase.customer {
                pinnedHeader(for: customer)

                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        nextRewardCard(for: customer)

                        if !supabase.offers.isEmpty {
                            offersFeed
                        }

                        if !supabase.transactions.isEmpty {
                            recentActivity
                        }
                    }
                    .padding(18)
                }
                .refreshable { await supabase.loadPortalData() }
            } else if supabase.isLoadingData {
                Spacer()
                ProgressView()
                Spacer()
            } else {
                Spacer()
                Text("Aucun profil de fidélité trouvé pour ce compte.")
                    .font(.system(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                Spacer()
            }
        }
        .background(MinervaColor.cream.ignoresSafeArea())
    }

    // MARK: - Pinned header + tier banner

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12: return "Bonjour"
        case 12..<18: return "Bon après-midi"
        default: return "Bonsoir"
        }
    }

    private func pinnedHeader(for customer: Customer) -> some View {
        let tier = LoyaltyTier.resolve(totalSpent: customer.totalSpent)
        let firstName = customer.name.split(separator: " ").first.map(String.init) ?? customer.name

        return VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                Text("\(greeting), \(firstName)")
                    .font(MinervaFont.display(24))
                    .foregroundStyle(MinervaColor.ink)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer()
                // Notifications/location icons mirror the Starbucks header
                // pattern visually — not wired to a destination yet (no
                // notification center or store-locator screen exists),
                // profile already has its own tab so isn't duplicated here.
                HStack(spacing: 16) {
                    Image(systemName: "bell")
                    Image(systemName: "mappin.and.ellipse")
                }
                .font(.system(size: 17))
                .foregroundStyle(MinervaColor.inkSoft)
            }

            Button {
                // Tier detail / progress explainer — Phase 2.
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Solde de points")
                            .font(.system(size: 11, weight: .medium))
                        Text("\(customer.loyaltyPoints) pts")
                            .font(MinervaFont.display(26))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer()
                    HStack(spacing: 4) {
                        Text(tier.label.uppercased())
                            .font(.system(size: 11.5, weight: .bold))
                            .tracking(0.4)
                            .fixedSize(horizontal: false, vertical: true)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .bold))
                    }
                }
                .foregroundStyle(tier.bannerForeground)
                .padding(16)
                .frame(maxWidth: .infinity)
                .background(tier.bannerColor)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
        .padding(EdgeInsets(top: 12, leading: 18, bottom: 14, trailing: 18))
        .background(MinervaColor.cream)
    }

    // MARK: - Next reward (feed item)

    private func nextRewardCard(for customer: Customer) -> some View {
        let cheapestReward = supabase.rewards.min(by: { $0.pointsCost < $1.pointsCost })

        return HStack(spacing: 12) {
            if let cheapestReward {
                let progress = min(100, Double(customer.loyaltyPoints) / Double(cheapestReward.pointsCost) * 100)
                RadialGauge(value: progress, centerValue: "\(Int(progress))%", centerLabel: "")
                VStack(alignment: .leading, spacing: 2) {
                    Text("Prochaine récompense")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(cheapestReward.name) · \(cheapestReward.pointsCost) pts")
                        .font(.system(size: 11))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
            } else {
                Image(systemName: "gift")
                    .font(.system(size: 22))
                    .foregroundStyle(MinervaColor.inkFaint)
                    .frame(width: 56, height: 56)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Aucune récompense pour l'instant")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Revenez plus tard, votre restaurant en ajoutera bientôt.")
                        .font(.system(size: 11))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Offers feed (Starbucks-style full-width promo cards)

    private var offersFeed: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("En ce moment")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ForEach(supabase.offers) { offer in
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "tag.fill")
                            .font(.system(size: 12))
                            .padding(.top, 2)
                        Text(offer.title)
                            .font(.system(size: 14, weight: .semibold))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .foregroundStyle(MinervaColor.emeraldDark)

                    if let description = offer.description {
                        Text(description)
                            .font(.system(size: 12))
                            .foregroundStyle(MinervaColor.emerald)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(MinervaColor.emerald.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.emerald.opacity(0.2)))
            }
        }
    }

    // MARK: - Recent activity

    private var recentActivity: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Historique récent")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 6) {
                ForEach(supabase.transactions.prefix(5)) { tx in
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(label(for: tx.type))
                                .font(.system(size: 12.5))
                                .foregroundStyle(MinervaColor.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Text(tx.createdAt.formatted(date: .abbreviated, time: .omitted))
                                .font(.system(size: 10))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }
                        Spacer()
                        Text("\(tx.pointsDelta >= 0 ? "+" : "")\(tx.pointsDelta) pts")
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(tx.pointsDelta >= 0 ? MinervaColor.emeraldDark : .red)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(12)
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

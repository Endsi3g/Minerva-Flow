import SwiftUI

/// Dedicated Ambassadeur page. Two things share that name and are explained
/// here side by side: the loyalty status earned by spending at a restaurant,
/// and the Minerva Flow ambassador programme (recommend the product, earn a
/// commission), whose workspace opens from the button below.
struct AmbassadorHubView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var showWorkspace = false
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    private var tier: LoyaltyTier? {
        supabase.customer.map {
            LoyaltyTier.resolve(totalSpent: $0.totalSpent, tier2: supabase.loyaltyTier2Threshold, tier3: supabase.loyaltyTier3Threshold)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(isFrench ? "Ambassadeur" : "Ambassador")
                        .font(MinervaFont.display(30, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .accessibilityAddTraits(.isHeader)
                    Text(isFrench ? "Votre statut de fidélité et le programme pour recommander Minerva Flow." : "Your loyalty status and the programme for recommending Minerva Flow.")
                        .font(.mv(size: 14))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }

                statusCard
                friendsSection
                howItWorks
                programmeCard
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Ambassadeur" : "Ambassador")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showWorkspace) {
            FlowAmbassadorMobileView().environmentObject(supabase)
        }
        .task { if supabase.referralPrograms.isEmpty { await supabase.fetchReferrals() } }
    }

    // MARK: - Friends (customer referral at the home restaurant)

    /// The same programs and links as the Offres tab, here as the main ambassador
    /// action: how many friends joined, what the reward is, and one tap to share.
    @ViewBuilder
    private var friendsSection: some View {
        if !supabase.referralPrograms.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text(isFrench ? "VOS AMIS" : "YOUR FRIENDS")
                    .font(.mv(size: 12, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(MinervaColor.inkFaint)
                    .accessibilityAddTraits(.isHeader)
                ForEach(supabase.referralPrograms) { progress in
                    friendCard(progress)
                }
            }
        }
    }

    private func friendCard(_ progress: ReferralProgress) -> some View {
        let program = progress.program
        let converted = progress.link?.convertedCount ?? 0
        let goal = max(1, program.goalCount)
        return VStack(alignment: .leading, spacing: 10) {
            Text(program.name)
                .font(.mv(size: 16, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            if let link = progress.link {
                Text(isFrench ? "\(converted) / \(goal) amis ont rejoint" : "\(converted) / \(goal) friends joined")
                    .font(.mv(size: 14))
                    .foregroundStyle(MinervaColor.inkSoft)
                ProgressView(value: min(1, Double(converted) / Double(goal)))
                    .tint(MinervaColor.emerald)
                if let reward = program.rewardDescription {
                    Label(isFrench ? "Récompense : \(reward)" : "Reward: \(reward)", systemImage: "gift.fill")
                        .font(.mv(size: 14))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
                ShareLink(item: shareURL(code: link.code), message: Text(shareMessage())) {
                    Label(isFrench ? "Partager mon lien" : "Share my link", systemImage: "square.and.arrow.up")
                        .font(.mv(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                }
                .foregroundStyle(.white)
                .background(MinervaColor.emerald)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MinervaColor.border, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private func shareURL(code: String) -> URL {
        var components = URLComponents(url: Config.publicLinkBaseURL.appending(path: "/p/\(code)"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "via", value: "ambassador")]
        return components?.url ?? Config.publicLinkBaseURL.appending(path: "/p/\(code)")
    }

    private func shareMessage() -> String {
        let name = supabase.restaurantName ?? (isFrench ? "notre restaurant" : "our restaurant")
        return isFrench
            ? "Je t'invite chez \(name) : installe l'app avec mon lien pour recevoir ton cadeau de bienvenue."
            : "I'm inviting you to \(name): install the app with my link to get your welcome gift."
    }

    // MARK: - Loyalty status (real numbers from the customer's own account)

    @ViewBuilder
    private var statusCard: some View {
        if let customer = supabase.customer, let tier {
            let next = nextThreshold(for: tier)
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    Image(systemName: tier.systemImage)
                        .font(.mv(size: 16, weight: .semibold))
                        .foregroundStyle(tier.bannerForeground)
                        .frame(width: 38, height: 38)
                        .background(tier.bannerColor)
                        .clipShape(Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(isFrench ? "Votre statut" : "Your status")
                            .font(.mv(size: 12, weight: .medium))
                            .foregroundStyle(MinervaColor.inkFaint)
                        Text(tier.label)
                            .font(MinervaFont.display(21, weight: .semibold))
                            .foregroundStyle(MinervaColor.ink)
                    }
                    Spacer()
                }
                HStack(spacing: 0) {
                    stat(value: currency(customer.totalSpent), label: isFrench ? "dépensés" : "spent")
                    Rectangle().fill(MinervaColor.border).frame(width: 1, height: 36)
                    stat(value: "\(customer.visitCount)", label: isFrench ? "visites" : "visits")
                    Rectangle().fill(MinervaColor.border).frame(width: 1, height: 36)
                    stat(value: "\(customer.loyaltyPoints)", label: isFrench ? "points" : "points")
                }
                if let next {
                    let remaining = max(0, next.threshold - customer.totalSpent)
                    VStack(alignment: .leading, spacing: 6) {
                        ProgressView(value: min(1, customer.totalSpent / next.threshold))
                            .tint(MinervaColor.emerald)
                        Text(isFrench
                             ? "Encore \(currency(remaining)) pour devenir \(next.label)."
                             : "\(currency(remaining)) more to reach \(next.label).")
                            .font(.mv(size: 12.5))
                            .foregroundStyle(MinervaColor.inkSoft)
                    }
                } else {
                    Text(isFrench ? "Vous avez atteint le plus haut statut de ce restaurant." : "You have reached this restaurant's top status.")
                        .font(.mv(size: 12.5))
                        .foregroundStyle(MinervaColor.inkSoft)
                }
            }
            .padding(16)
            .background(MinervaColor.creamSoft)
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(MinervaColor.border, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 18))
        }
    }

    private func nextThreshold(for tier: LoyaltyTier) -> (threshold: Double, label: String)? {
        switch tier {
        case .habitue: return (supabase.loyaltyTier2Threshold, LoyaltyTier.privilegie.label)
        case .privilegie: return (supabase.loyaltyTier3Threshold, LoyaltyTier.ambassadeur.label)
        case .ambassadeur: return nil
        }
    }

    private func stat(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.mv(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(MinervaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.mv(size: 11.5))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(maxWidth: .infinity)
    }

    private func currency(_ value: Double) -> String {
        value.formatted(.currency(code: "CAD").locale(Locale(identifier: isFrench ? "fr_CA" : "en_CA")))
    }

    // MARK: - Programme

    private var howItWorks: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(isFrench ? "COMMENT ÇA MARCHE" : "HOW IT WORKS")
                .font(.mv(size: 12, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(MinervaColor.inkFaint)
            step(1, isFrench ? "Partagez votre lien" : "Share your link",
                 isFrench ? "Recommandez Minerva Flow à un restaurant ou un café que vous connaissez." : "Recommend Minerva Flow to a restaurant or café you know.")
            step(2, isFrench ? "Ils adoptent Minerva Flow" : "They adopt Minerva Flow",
                 isFrench ? "Votre recommandation compte quand l'établissement crée son compte avec votre lien." : "Your recommendation counts once the venue signs up with your link.")
            step(3, isFrench ? "Vous êtes récompensé" : "You are rewarded",
                 isFrench ? "Selon votre contrat avec l'équipe Minerva Flow. Écrivez-nous pour le mettre en place." : "As set by your contract with the Minerva Flow team. Email us to set it up.")
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MinervaColor.border, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private func step(_ number: Int, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.mv(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 26, height: 26)
                .background(MinervaColor.emerald)
                .clipShape(Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                Text(detail)
                    .font(.mv(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var programmeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(isFrench ? "Votre espace ambassadeur" : "Your ambassador workspace")
                .font(.mv(size: 15, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            Text(isFrench
                 ? "Retrouvez vos liens de suivi, vos commissions et vos contenus. Les versements se gèrent sur le web."
                 : "Find your tracking links, commissions and content. Payouts are managed on the web.")
                .font(.mv(size: 12.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            Button { showWorkspace = true } label: {
                Text(isFrench ? "Ouvrir mon espace" : "Open my workspace")
                    .font(.mv(size: 14, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
            }
            .foregroundStyle(.white)
            .background(MinervaColor.emerald)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(16)
        .background(MinervaColor.creamSoft)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MinervaColor.border, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}

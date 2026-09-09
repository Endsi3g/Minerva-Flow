import SwiftUI

/// The stop between seeing a reward and spending points on it — shared by
/// Home's "next reward" card and the Rewards catalog, both of which used to
/// jump straight to an alert-confirm redeem (or, on Home, offer no way to
/// act on the reward at all). Redemption itself is unchanged: still
/// self_redeem_reward via SupabaseManager.redeem, just one screen later so
/// the customer sees what they're spending points on and which restaurant
/// it's for before committing.
struct RewardDetailView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let reward: LoyaltyReward

    @State private var isRedeeming = false
    @State private var didRedeem = false

    private var points: Int { supabase.customer?.loyaltyPoints ?? 0 }
    private var affordable: Bool { points >= reward.pointsCost }
    /// Resolved locally against the already-fetched menu rather than a
    /// server-side join — see LoyaltyReward.menuItemId's doc comment for
    /// why (menu_items has no customer-facing RLS SELECT policy).
    private var linkedMenuItem: NativeMenuItem? {
        guard let menuItemId = reward.menuItemId else { return nil }
        return supabase.menuItems.first { $0.id == menuItemId }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let menuItem = linkedMenuItem, !menuItem.galleryImageURLs.isEmpty {
                        linkedItemPhoto(menuItem)
                    }
                    header
                    if let description = reward.description, !description.trimmingCharacters(in: .whitespaces).isEmpty {
                        Text(description)
                            .font(.system(size: 13.5))
                            .foregroundStyle(MinervaColor.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if let menuItem = linkedMenuItem {
                        linkedItemCard(menuItem)
                    }
                    identityRow
                    pointsRow
                    redemptionInstructions
                    actionButton
                }
                .padding(20)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Récompense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
            .alert("Erreur", isPresented: Binding(
                get: { supabase.lastError != nil },
                set: { if !$0 { supabase.lastError = nil } }
            )) {
                Button("OK", role: .cancel) { supabase.lastError = nil }
            } message: {
                Text(supabase.lastError ?? "")
            }
            .task {
                // Lazy: the menu is normally only fetched when Commander is
                // opened, but a reward can be reached from Home/Rewards
                // first — fetch it here too so the linked-item preview
                // above isn't just empty for someone who hasn't visited
                // Commander yet this session.
                if reward.menuItemId != nil, supabase.menuItems.isEmpty {
                    await supabase.fetchMenu()
                }
            }
        }
    }

    /// Full-width preview of the linked dish, so the reward reads as "this
    /// exact item, free" rather than a bare points transaction — the same
    /// visual weight OfferDetailView gives its own header image.
    private func linkedItemPhoto(_ menuItem: NativeMenuItem) -> some View {
        AsyncImage(url: URL(string: menuItem.galleryImageURLs.first ?? "")) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Rectangle().fill(MinervaColor.ink.opacity(0.06))
            }
        }
        .frame(height: 180)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .clipped()
    }

    private func linkedItemCard(_ menuItem: NativeMenuItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "fork.knife")
                    .font(.system(size: 11))
                Text("Cette récompense vous donne")
                    .font(.system(size: 11.5, weight: .semibold))
                    .textCase(.uppercase)
            }
            .foregroundStyle(MinervaColor.inkFaint)

            Text(menuItem.name)
                .font(.system(size: 14.5, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)

            if let itemDescription = menuItem.description, !itemDescription.trimmingCharacters(in: .whitespaces).isEmpty {
                Text(itemDescription)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.emerald.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var redemptionInstructions: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Comment l'utiliser")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            instructionRow(number: 1, text: "Échangez vos points ci-dessous pour générer un code.")
            instructionRow(number: 2, text: "Montrez ce code au personnel lors de votre prochaine visite, dans l'onglet Récompenses.")
            instructionRow(number: 3, text: "Le personnel valide le code et votre récompense est appliquée sur place.")
        }
    }

    private func instructionRow(number: Int, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(number)")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 18, height: 18)
                .background(MinervaColor.emerald)
                .clipShape(Circle())
            Text(text)
                .font(.system(size: 12.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack {
                Circle().fill(MinervaColor.emerald.opacity(0.12))
                Image(systemName: "gift.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }
            .frame(width: 56, height: 56)

            Text(reward.name)
                .font(MinervaFont.display(22))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var identityRow: some View {
        HStack(spacing: 6) {
            Image(systemName: "storefront.fill")
                .font(.system(size: 11))
            Text("Échangeable chez \(supabase.restaurantIdentityLabel)")
                .fixedSize(horizontal: false, vertical: true)
        }
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(MinervaColor.emeraldDark)
    }

    private var pointsRow: some View {
        HStack {
            Text("\(reward.pointsCost) points")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(MinervaColor.ink)
            Spacer()
            Text("Vous avez \(points) pts")
                .font(.system(size: 12.5))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var actionButton: some View {
        Button {
            Task { await redeem() }
        } label: {
            Group {
                if isRedeeming {
                    ProgressView()
                } else if didRedeem {
                    Label("Échangé — voir le code dans Récompenses", systemImage: "checkmark.circle.fill")
                } else {
                    Text(affordable ? "Échanger \(reward.pointsCost) points" : "Points insuffisants")
                }
            }
            .frame(maxWidth: .infinity)
        }
        .font(.system(size: 14, weight: .semibold))
        .padding(.vertical, 14)
        .background(affordable && !didRedeem ? MinervaColor.emerald : MinervaColor.ink.opacity(0.08))
        .foregroundStyle(affordable && !didRedeem ? .white : MinervaColor.inkFaint)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .buttonStyle(PressableButtonStyle())
        .disabled(!affordable || isRedeeming || didRedeem)
    }

    private func redeem() async {
        guard !isRedeeming, !didRedeem else { return }
        isRedeeming = true
        defer { isRedeeming = false }
        let generator = UINotificationFeedbackGenerator()
        let success = await supabase.redeem(reward: reward)
        generator.notificationOccurred(success ? .success : .error)
        if success { didRedeem = true }
    }
}

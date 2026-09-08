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

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    if let description = reward.description, !description.trimmingCharacters(in: .whitespaces).isEmpty {
                        Text(description)
                            .font(.system(size: 13.5))
                            .foregroundStyle(MinervaColor.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    identityRow
                    pointsRow
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

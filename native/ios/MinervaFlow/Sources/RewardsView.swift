import SwiftUI

/// Full redemption flow, matching the web portal's RewardsRedeemCard: a
/// list of the restaurant's active rewards, each redeemable in one tap once
/// affordable, generating a short code shown to staff in person. Points are
/// deducted at redemption request time, not at claim time (see
/// self_redeem_reward's own doc comment in the migration) to avoid a
/// double-spend race across concurrent pending requests, so the balance
/// shown here already reflects that the instant a redemption is confirmed.
struct RewardsView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var redeemingId: String?
    @State private var confirmingReward: LoyaltyReward?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header

                if let pending = pendingRedemptions, !pending.isEmpty {
                    pendingSection(pending)
                }

                catalogSection
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .refreshable { await supabase.loadPortalData() }
        .alert("Confirmer l'échange", isPresented: Binding(
            get: { confirmingReward != nil },
            set: { if !$0 { confirmingReward = nil } }
        )) {
            Button("Annuler", role: .cancel) { confirmingReward = nil }
            Button("Échanger") {
                if let reward = confirmingReward {
                    Task { await performRedeem(reward) }
                }
            }
        } message: {
            if let reward = confirmingReward {
                Text("Échanger \(reward.pointsCost) points contre \"\(reward.name)\" ? Un code vous sera montré à présenter en salle.")
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

    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Récompenses")
                .font(MinervaFont.display(24))
                .foregroundStyle(MinervaColor.ink)
            if let points = supabase.customer?.loyaltyPoints {
                Text("\(points) points disponibles")
                    .font(.system(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
            }
        }
    }

    private var pendingRedemptions: [RewardRedemption]? {
        supabase.redemptions.filter { $0.status == "pending" }
    }

    private func pendingSection(_ pending: [RewardRedemption]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("À montrer en salle")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ForEach(pending) { redemption in
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 13))
                        Text(redemption.rewardName)
                            .font(.system(size: 13, weight: .medium))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .foregroundStyle(MinervaColor.emeraldDark)
                    Spacer(minLength: 8)
                    Text(redemption.code)
                        .font(.system(size: 17, weight: .bold, design: .monospaced))
                        .tracking(2)
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
                .padding(14)
                .background(MinervaColor.emerald.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    private var catalogSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Catalogue")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            if supabase.rewards.isEmpty {
                Text("Aucune récompense disponible pour l'instant. Revenez plus tard.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.vertical, 8)
            } else {
                ForEach(supabase.rewards) { reward in
                    rewardRow(reward)
                }
            }
        }
    }

    private func rewardRow(_ reward: LoyaltyReward) -> some View {
        let points = supabase.customer?.loyaltyPoints ?? 0
        let affordable = points >= reward.pointsCost
        let isBusy = redeemingId == reward.id

        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(reward.name)
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if let description = reward.description {
                    Text(description)
                        .font(.system(size: 11.5))
                        .foregroundStyle(MinervaColor.inkFaint)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 8)

            VStack(spacing: 6) {
                Text("\(reward.pointsCost) pts")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(affordable ? MinervaColor.emeraldDark : MinervaColor.inkFaint)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(affordable ? MinervaColor.emerald.opacity(0.12) : MinervaColor.ink.opacity(0.06))
                    .clipShape(Capsule())

                Button {
                    confirmingReward = reward
                } label: {
                    if isBusy {
                        ProgressView().frame(width: 60)
                    } else {
                        Text("Échanger")
                            .font(.system(size: 11.5, weight: .semibold))
                            .frame(width: 68)
                    }
                }
                .padding(.vertical, 7)
                .background(affordable ? MinervaColor.emerald : MinervaColor.ink.opacity(0.08))
                .foregroundStyle(affordable ? .white : MinervaColor.inkFaint)
                .clipShape(Capsule())
                .buttonStyle(PressableButtonStyle())
                .disabled(!affordable || isBusy)
            }
        }
        .padding(14)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func performRedeem(_ reward: LoyaltyReward) async {
        redeemingId = reward.id
        defer { redeemingId = nil }
        let generator = UINotificationFeedbackGenerator()
        let success = await supabase.redeem(reward: reward)
        generator.notificationOccurred(success ? .success : .error)
    }
}

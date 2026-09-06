import SwiftUI
import CoreImage.CIFilterBuiltins

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
    @State private var hasLoadedReferrals = false
    @State private var qrProgram: ReferralProgress?
    @State private var selectedOffer: Offer?

    var body: some View {
        Group {
            if supabase.isLoadingData && supabase.customer == nil {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        SkeletonBlock(cornerRadius: 6).frame(width: 160, height: 24)
                        Skeletons.list(count: 4)
                    }
                    .padding(18)
                }
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        header

                        if let pending = pendingRedemptions, !pending.isEmpty {
                            pendingSection(pending)
                        }

                        if !supabase.offers.isEmpty {
                            offersCatalogSection
                        }

                        catalogSection

                        if !supabase.referralPrograms.isEmpty {
                            referralSection
                        }
                    }
                    .padding(18)
                }
                .sheet(item: $selectedOffer) { offer in
                    OfferDetailView(offer: offer)
                }
                .refreshable {
                    await supabase.loadPortalData()
                    await supabase.fetchReferrals()
                }
            }
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .task {
            guard !hasLoadedReferrals else { return }
            hasLoadedReferrals = true
            await supabase.fetchReferrals()
        }
        .sheet(item: $qrProgram) { progress in
            ReferralQRSheet(progress: progress, restaurantName: supabase.restaurantName)
        }
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

    /// Offers get their own catalog here too, not just the Home feed —
    /// tapping one opens its full detail page instead of only being a
    /// promo card that jumps straight to ordering.
    private var offersCatalogSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Offres")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ForEach(supabase.offers) { offer in
                Button {
                    selectedOffer = offer
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().fill(MinervaColor.emerald.opacity(0.12))
                            Image(systemName: "tag.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(MinervaColor.emeraldDark)
                        }
                        .frame(width: 38, height: 38)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(offer.title)
                                .font(.system(size: 13.5, weight: .semibold))
                                .foregroundStyle(MinervaColor.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            if let description = offer.description {
                                Text(description)
                                    .font(.system(size: 11.5))
                                    .foregroundStyle(MinervaColor.inkFaint)
                                    .lineLimit(1)
                            }
                        }
                        Spacer(minLength: 8)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(MinervaColor.inkFaint)
                    }
                    .padding(12)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
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
                if let restaurantName = supabase.restaurantName {
                    HStack(spacing: 4) {
                        Image(systemName: "storefront.fill")
                            .font(.system(size: 9))
                        Text("Échangeable chez \(restaurantName)")
                    }
                    .font(.system(size: 10.5, weight: .medium))
                    .foregroundStyle(MinervaColor.emerald)
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

    // MARK: - Referral / parrainage (mirrors web's ReferralProgramCard)

    private var referralSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Programmes de parrainage")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ForEach(supabase.referralPrograms) { progress in
                referralCard(progress)
            }
        }
    }

    private func referralCard(_ progress: ReferralProgress) -> some View {
        let program = progress.program
        let convertedCount = progress.link?.convertedCount ?? 0
        let goalProgress = min(1, Double(convertedCount) / Double(max(1, program.goalCount)))
        let rewardUnlocked = progress.link?.rewardClaimedAt != nil

        return VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(program.name)
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if let description = program.description {
                    Text(description)
                        .font(.system(size: 11.5))
                        .foregroundStyle(MinervaColor.inkFaint)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            if let link = progress.link {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("\(convertedCount) / \(program.goalCount) amis parrainés")
                            .font(.system(size: 11.5))
                            .foregroundStyle(MinervaColor.inkSoft)
                        Spacer()
                        if rewardUnlocked {
                            Text("Débloqué")
                                .font(.system(size: 10.5, weight: .bold))
                                .foregroundStyle(MinervaColor.emeraldDark)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(MinervaColor.emerald.opacity(0.12))
                                .clipShape(Capsule())
                        }
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(MinervaColor.ink.opacity(0.08))
                            Capsule().fill(MinervaColor.emerald)
                                .frame(width: max(6, geo.size.width * goalProgress))
                        }
                    }
                    .frame(height: 6)

                    if let rewardDescription = program.rewardDescription {
                        HStack(spacing: 6) {
                            Image(systemName: "gift.fill")
                                .font(.system(size: 11))
                            Text("Récompense : \(rewardDescription)")
                                .font(.system(size: 11.5))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .foregroundStyle(MinervaColor.emerald)
                    }

                    // Pre-generated, always visible above the share
                    // button — no "get my link" tap needed first (see
                    // SupabaseManager.fetchReferrals's own comment: every
                    // program already has a link by the time this renders).
                    // Large and full-width: this is meant to be scanned
                    // directly off the phone screen, a thumbnail-sized code
                    // isn't usable for that.
                    Button {
                        qrProgram = progress
                    } label: {
                        if let qrImage = QRCodeGenerator.image(for: referralShareURL(code: link.code)) {
                            Image(uiImage: qrImage)
                                .interpolation(.none)
                                .resizable()
                                .scaledToFit()
                                .frame(maxWidth: .infinity)
                                .frame(height: 220)
                                .padding(16)
                                .background(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.emerald.opacity(0.25), lineWidth: 2))
                        }
                    }
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)

                    ShareLink(item: referralShareURL(code: link.code), message: Text(referralShareText(program: program, code: link.code))) {
                        HStack(spacing: 6) {
                            Image(systemName: "square.and.arrow.up")
                            Text("Partager mon lien")
                        }
                        .font(.system(size: 12, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                    }
                    .foregroundStyle(.white)
                    .background(MinervaColor.emerald)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .buttonStyle(PressableButtonStyle())
                    .padding(.top, 2)
                }
            } else {
                // Link generation is now automatic (see fetchReferrals) —
                // this only ever shows if that silently failed, so it
                // reads as a retry, not a required first step.
                Button {
                    Task { _ = await supabase.createReferralLink(for: program.id) }
                } label: {
                    Text("Réessayer")
                        .font(.system(size: 12.5, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .foregroundStyle(.white)
                .background(MinervaColor.emerald)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .buttonStyle(PressableButtonStyle())
            }
        }
        .padding(14)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func referralShareURL(code: String) -> URL {
        Config.apiBaseURL.appending(path: "/p/\(code)")
    }

    private func referralShareText(program: ProgramLike, code: String) -> String {
        let name = supabase.restaurantName ?? "notre restaurant"
        return "Je t'invite chez \(name) ! Utilise mon lien pour découvrir la carte et recevoir ton cadeau de bienvenue : \(referralShareURL(code: code).absoluteString)"
    }
}

/// ReferralProgram already fits this shape — named separately only so
/// referralShareText reads clearly about what it actually needs.
private typealias ProgramLike = ReferralProgram

/// Native QR generation (CoreImage, no third-party library) for scanning a
/// referral link at the table — mirrors the web portal's PeerQrModal
/// exactly (same share URL, same "scan with your camera" framing).
struct ReferralQRSheet: View {
    let progress: ReferralProgress
    let restaurantName: String?
    @Environment(\.dismiss) private var dismiss

    private var shareURL: URL {
        Config.apiBaseURL.appending(path: "/p/\(progress.link?.code ?? "")")
    }

    private var qrImage: UIImage? { QRCodeGenerator.image(for: shareURL) }

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Text(progress.program.name)
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)

                if let qrImage {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 220, height: 220)
                        .padding(16)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(MinervaColor.emerald.opacity(0.3), lineWidth: 3))
                } else {
                    ProgressView().frame(width: 220, height: 220)
                }

                Text("Votre ami peut scanner ce code directement depuis l'appareil photo de son téléphone.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 30)

                Spacer()
            }
            .padding(.top, 24)
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Faire scanner à table")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}

/// Shared by the inline referral-card QR and its full-screen sheet — one
/// CoreImage code path, no third-party library.
enum QRCodeGenerator {
    static func image(for url: URL) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(url.absoluteString.utf8)
        filter.correctionLevel = "M"
        guard let outputImage = filter.outputImage else { return nil }
        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaled = outputImage.transformed(by: transform)
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

import SwiftUI

/// The tier-status explainer carousel from the Starbucks reference
/// ("Welcome to the new Starbucks Rewards" -> "Welcome to Green status" ->
/// "Earn 500 Stars to reach Gold") — shown exactly once, right after a
/// customer's very first successful login (tracked via UserDefaults,
/// checked in RootView), never again on subsequent logins. Adapted to our
/// own tier system: Habitué/Privilégié/Ambassadeur, thresholds on total
/// spend rather than a rolling 12-month star count, since that is how
/// lib/loyalty-tiers.ts actually works.
struct OnboardingWelcomeView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @EnvironmentObject var location: LocationManager
    @EnvironmentObject var notifications: NotificationManager
    let onFinish: () -> Void

    @State private var page = 0
    private let pageCount = 5

    var body: some View {
        ZStack {
            (page == 0 ? MinervaColor.emeraldDark : MinervaColor.cream)
                .ignoresSafeArea()
                .animation(.easeInOut(duration: 0.35), value: page)

            VStack(spacing: 0) {
                topBar

                TabView(selection: $page) {
                    welcomePage.tag(0)
                    currentTierPage.tag(1)
                    nextTierPage.tag(2)
                    locationPermissionPage.tag(3)
                    notificationPermissionPage.tag(4)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
        }
    }

    private var topBar: some View {
        HStack {
            Button {
                if page > 0 { page -= 1 }
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .semibold))
                    .frame(width: 36, height: 36)
                    .background(topBarButtonBackground)
                    .clipShape(Circle())
            }
            .accessibilityLabel("Retour")
            .accessibilityHidden(page == 0)
            .opacity(page > 0 ? 1 : 0)

            Spacer()

            HStack(spacing: 5) {
                ForEach(0..<pageCount, id: \.self) { i in
                    Capsule()
                        .fill(i == page ? topBarForeground : topBarForeground.opacity(0.25))
                        .frame(width: i == page ? 18 : 6, height: 4)
                        .animation(.easeInOut(duration: 0.25), value: page)
                }
            }

            Spacer()

            Button(action: onFinish) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(width: 36, height: 36)
                    .background(topBarButtonBackground)
                    .clipShape(Circle())
            }
            .accessibilityLabel("Fermer l'introduction")
        }
        .foregroundStyle(topBarForeground)
        .padding(.horizontal, 20)
        .padding(.top, 12)
    }

    private var topBarForeground: Color { page == 0 ? .white : MinervaColor.ink }
    private var topBarButtonBackground: Color { page == 0 ? .white.opacity(0.15) : MinervaColor.ink.opacity(0.06) }

    // MARK: Page 1

    private var welcomePage: some View {
        VStack(spacing: 28) {
            Spacer()
            Image("LogoMark")
                .resizable()
                .frame(width: 64, height: 64)
            Text("MINERVA FLOW\nRÉCOMPENSES")
                .font(.system(size: 14, weight: .bold))
                .tracking(2)
                .multilineTextAlignment(.center)
                .foregroundStyle(.white)
            Text("Bienvenue dans\nvotre espace fidélité")
                .font(MinervaFont.display(30))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            Spacer()
            pageButton(title: "Voir mon statut", style: .light) { page = 1 }
        }
        .padding(28)
    }

    // MARK: Page 2

    private var currentTierPage: some View {
        let tier = LoyaltyTier.resolve(totalSpent: supabase.customer?.totalSpent ?? 0, tier2: supabase.loyaltyTier2Threshold, tier3: supabase.loyaltyTier3Threshold)

        return VStack(spacing: 20) {
            Spacer()
            Text("Bienvenue au statut\n\(tier.label)")
                .font(MinervaFont.display(26))
                .foregroundStyle(MinervaColor.ink)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            Text("Découvrez vos avantages et ce qui vous attend au prochain palier.")
                .font(.system(size: 13.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 16)

            HStack(spacing: -18) {
                tierBadge(.habitue, isActive: tier == .habitue)
                tierBadge(.privilegie, isActive: tier == .privilegie)
                tierBadge(.ambassadeur, isActive: tier == .ambassadeur)
            }
            .padding(.vertical, 12)

            HStack(spacing: 22) {
                Text("Habitué").font(.system(size: 12, weight: .semibold))
                Text("Privilégié").font(.system(size: 12, weight: .semibold))
                Text("Ambassadeur").font(.system(size: 12, weight: .semibold))
            }
            .foregroundStyle(MinervaColor.inkSoft)

            Spacer()
            pageButton(title: "Voir mes avantages", style: .dark) { page = 2 }
        }
        .padding(28)
    }

    private func tierBadge(_ tier: LoyaltyTier, isActive: Bool) -> some View {
        ZStack {
            Circle()
                .fill(tier.bannerColor)
                .frame(width: isActive ? 96 : 76, height: isActive ? 96 : 76)
            Image(systemName: tier.systemImage)
                .font(.system(size: isActive ? 30 : 22))
                .foregroundStyle(tier.bannerForeground)
        }
        .zIndex(isActive ? 1 : 0)
        .opacity(isActive ? 1 : 0.55)
    }

    // MARK: Page 3

    private var nextTierPage: some View {
        let customer = supabase.customer
        let totalSpent = customer?.totalSpent ?? 0
        let tier = LoyaltyTier.resolve(totalSpent: totalSpent, tier2: supabase.loyaltyTier2Threshold, tier3: supabase.loyaltyTier3Threshold)
        let nextTier: LoyaltyTier? = tier == .habitue ? .privilegie : (tier == .privilegie ? .ambassadeur : nil)
        let target: Double = tier == .habitue ? supabase.loyaltyTier2Threshold : supabase.loyaltyTier3Threshold
        let remaining = max(0, target - totalSpent)
        let progress = min(1, totalSpent / target)

        return VStack(spacing: 20) {
            Spacer()

            if let nextTier {
                Text("Dépensez \(Int(remaining)) $ de plus\npour atteindre \(nextTier.label)")
                    .font(MinervaFont.display(24))
                    .foregroundStyle(MinervaColor.ink)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Débloquez encore plus d'avantages en continuant à visiter vos restaurants favoris.")
                    .font(.system(size: 13.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 16)

                ZStack {
                    Circle().stroke(MinervaColor.border, lineWidth: 8).frame(width: 170, height: 170)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(tier.bannerColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .frame(width: 170, height: 170)
                        .rotationEffect(.degrees(-90))
                    Image(systemName: nextTier.systemImage)
                        .font(.system(size: 40))
                        .foregroundStyle(nextTier.bannerColor)
                }
                .padding(.vertical, 8)

                HStack(spacing: 40) {
                    Text(tier.label).font(.system(size: 12.5, weight: .semibold))
                    Text(nextTier.label).font(.system(size: 12.5, weight: .semibold))
                }
                .foregroundStyle(MinervaColor.inkSoft)
            } else {
                Text("Vous êtes\nAmbassadeur")
                    .font(MinervaFont.display(26))
                    .foregroundStyle(MinervaColor.ink)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Le plus haut palier de fidélité, merci pour votre confiance.")
                    .font(.system(size: 13.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                Image(systemName: "crown.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(MinervaColor.limeAccent)
                    .padding(.vertical, 20)
            }

            Spacer()

            pageButton(title: "Continuer", style: .dark) { page = 3 }
        }
        .padding(28)
    }

    // MARK: Page 4 — location rationale

    private var locationPermissionPage: some View {
        VStack(spacing: 24) {
            Spacer()
            ZStack {
                Circle().fill(MinervaColor.emerald.opacity(0.12)).frame(width: 110, height: 110)
                Image(systemName: "location.fill")
                    .font(.system(size: 42))
                    .foregroundStyle(MinervaColor.emerald)
            }
            Text("Trouvez les restaurants\nautour de vous")
                .font(MinervaFont.display(24))
                .foregroundStyle(MinervaColor.ink)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            Text("Votre position sert uniquement à trouver et trier les restaurants et cafés participants les plus proches de vous sur la carte de découverte. Elle n'est jamais partagée ni utilisée à d'autres fins.")
                .font(.system(size: 13.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 16)
            Spacer()
            VStack(spacing: 10) {
                pageButton(title: locationButtonTitle, style: .dark) {
                    if location.authorizationStatus == .notDetermined {
                        location.requestPermission()
                    }
                    page = 4
                }
                Button("Plus tard") { page = 4 }
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
            }
        }
        .padding(28)
    }

    private var locationButtonTitle: String {
        switch location.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways: return "Localisation activée ✓"
        case .denied, .restricted: return "Continuer"
        default: return "Activer la localisation"
        }
    }

    // MARK: Page 5 — notifications rationale

    private var notificationPermissionPage: some View {
        VStack(spacing: 24) {
            Spacer()
            ZStack {
                Circle().fill(MinervaColor.emerald.opacity(0.12)).frame(width: 110, height: 110)
                Image(systemName: "bell.badge.fill")
                    .font(.system(size: 42))
                    .foregroundStyle(MinervaColor.emerald)
            }
            Text("Ne manquez\naucune offre")
                .font(MinervaFont.display(24))
                .foregroundStyle(MinervaColor.ink)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            Text("Recevez une notification dès qu'une nouvelle offre est publiée par votre restaurant, et un rappel discret pour vos récompenses prêtes à échanger. Vous pouvez changer d'avis à tout moment dans Réglages.")
                .font(.system(size: 13.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 16)
            Spacer()
            VStack(spacing: 10) {
                pageButton(title: notificationButtonTitle, style: .dark) {
                    if notifications.authorizationStatus == .notDetermined {
                        Task { _ = await notifications.requestPermission() }
                    }
                    onFinish()
                }
                Button("Plus tard", action: onFinish)
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
            }
        }
        .padding(28)
    }

    private var notificationButtonTitle: String {
        switch notifications.authorizationStatus {
        case .authorized: return "Notifications activées ✓"
        case .denied: return "Terminer"
        default: return "Activer les notifications"
        }
    }

    // MARK: Shared

    private enum ButtonStyle { case light, dark }

    private func pageButton(title: String, style: ButtonStyle, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
        }
        .background(style == .light ? .white : MinervaColor.emerald)
        .foregroundStyle(style == .light ? MinervaColor.emeraldDark : .white)
        .clipShape(Capsule())
        .buttonStyle(PressableButtonStyle())
    }
}

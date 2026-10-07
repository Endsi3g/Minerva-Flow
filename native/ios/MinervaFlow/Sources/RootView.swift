import SwiftUI

private let hasSeenOnboardingKey = "hasSeenTierOnboarding"

private enum RootScreen { case intro, auth, resolvingSession, resolutionError, restaurantOnboarding, onboarding, ownerOnboarding, main, ownerMain, teamMain }

/// Full flow: Intro (brand-new visitor hero) -> AuthView (real login,
/// matches the web portal exactly) -> OnboardingWelcomeView (tier-status
/// explainer, shown exactly once via UserDefaults) -> MainTabView.
///
/// Every transition crossfades explicitly — a plain if/else swap between
/// branches with no shared identity cuts instantly with no animation at
/// all, which is exactly what made the green Intro screen jumping straight
/// to cream Auth feel broken. ZStack + explicit `.id` per screen +
/// `.transition(.opacity)` inside a `withAnimation` block is what actually
/// produces a crossfade in SwiftUI; a bare `if condition { A } else { B }`
/// does not do this on its own.
private struct ResolvedUniversalLinkRestaurant: Identifiable {
    let id: String
    let name: String
}

struct RootView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @EnvironmentObject var biometricLock: BiometricLock
    @EnvironmentObject var router: DeepLinkRouter
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @AppStorage("appAppearance") private var storedAppearance = AppAppearance.light.rawValue

    @State private var screen: RootScreen = .intro
    @State private var resolvedLinkRestaurant: ResolvedUniversalLinkRestaurant?
    @State private var universalLinkError: String?
#if DEBUG
    @State private var didStartUITestSignIn = false
#endif

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    private func applyPendingNotificationIfReady() {
        guard supabase.isAuthenticated,
              !supabase.isResolvingExperience,
              let link = router.pendingNotificationLink else { return }
        router.pendingNotificationLink = nil
        router.handleNotificationLink(link, isOwner: supabase.isOwnerExperience)
    }

    /// Re-reading this when the user changes Settings › Display › Text Size
    /// makes the whole tree rebuild with the new scaled fonts (see Font.mv).
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        ZStack {
            switch screen {
            case .intro:
                IntroView { transition(to: .auth) }
                    .id(RootScreen.intro)
                    .transition(.opacity)
            case .auth:
                AuthView()
                    .id(RootScreen.auth)
                    .transition(.opacity)
            case .resolvingSession:
                resolutionView(isError: false)
                    .id(RootScreen.resolvingSession)
                    .transition(.opacity)
            case .resolutionError:
                resolutionView(isError: true)
                    .id(RootScreen.resolutionError)
                    .transition(.opacity)
            case .restaurantOnboarding:
                RestaurantConnectionOnboardingView()
                    .id(RootScreen.restaurantOnboarding)
                    .transition(.opacity)
            case .onboarding:
                OnboardingWelcomeView {
                    UserDefaults.standard.set(true, forKey: onboardingKey)
                    transition(to: .main)
                }
                .id(RootScreen.onboarding)
                .transition(.opacity)
            case .main:
                MainTabView()
                    .id(RootScreen.main)
                    .transition(.opacity)
            case .ownerMain:
                OwnerMainTabView()
                    .id(RootScreen.ownerMain)
                    .transition(.opacity)
            case .teamMain:
                TeamMainView()
                    .id(RootScreen.teamMain)
                    .transition(.opacity)
            case .ownerOnboarding:
                NativeOwnerOnboardingView {
                    UserDefaults.standard.set(true, forKey: ownerSetupKey)
                    transition(to: .ownerMain)
                }
                .id(RootScreen.ownerOnboarding)
                .transition(.opacity)
            }
        }
        .id(dynamicTypeSize)
        // Settings › Accessibility › Reduce Motion: no animated transitions anywhere.
        .transaction { transaction in
            if UIAccessibility.isReduceMotionEnabled { transaction.animation = nil }
        }
        // The selected app language is independent of the device language.
        // Feed it to SwiftUI's LocalizedStringKey resolver too, so static
        // French copy does not fall through to the English bundle.
        .environment(\.locale, Locale(identifier: AppLanguage(rawValue: storedLanguage)?.localeIdentifier ?? AppLanguage.fr.localeIdentifier))
        .preferredColorScheme(AppAppearance(rawValue: storedAppearance)?.colorScheme)
        .onAppear {
            maybeSignInUITestUser()
            syncScreen()
            applyPendingNotificationIfReady()
            if screen == .main { biometricLock.lockIfEnabled() }
        }
        .onChange(of: supabase.isAuthenticated) { syncScreen(); applyPendingNotificationIfReady() }
        .onChange(of: supabase.customer?.id) { syncScreen() }
        .onChange(of: supabase.isOwnerExperience) { syncScreen() }
        .onChange(of: supabase.isTeamExperience) { syncScreen() }
        .onChange(of: supabase.isResolvingExperience) { syncScreen(); applyPendingNotificationIfReady() }
        .onChange(of: supabase.experienceResolutionError) { syncScreen() }
        // Only ever covers .main — the lock protects the loyalty account's
        // data, not the login/onboarding screens that precede having one.
        .fullScreenCover(isPresented: Binding(
            get: { (screen == .main || screen == .ownerMain) && biometricLock.isLocked },
            set: { _ in }
        )) {
            BiometricLockView()
        }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
            if let url = activity.webpageURL {
                router.handleUniversalLink(url)
            }
        }
        // A link can arrive before auth/onboarding finishes (cold launch
        // straight from Messages/Safari) — only resolve once .main is
        // actually reached, and re-check whenever screen changes so a link
        // that arrived early isn't silently dropped.
        .onChange(of: router.pendingUniversalLink) { _, _ in resolvePendingUniversalLinkIfReady() }
        .onChange(of: screen) { _, _ in resolvePendingUniversalLinkIfReady() }
        .fullScreenCover(item: $resolvedLinkRestaurant) { restaurant in
            RestaurantDetailView(restaurantId: restaurant.id, previewName: restaurant.name)
        }
        .alert(isFrench ? "Lien invalide" : "Invalid link", isPresented: Binding(
            get: { universalLinkError != nil },
            set: { if !$0 { universalLinkError = nil } }
        )) {
            Button("OK", role: .cancel) { universalLinkError = nil }
        } message: {
            Text(universalLinkError ?? "")
        }
    }

    private func resolvePendingUniversalLinkIfReady() {
        guard (screen == .main || screen == .restaurantOnboarding), let link = router.pendingUniversalLink else { return }
        router.pendingUniversalLink = nil
        Task { await resolveUniversalLink(link) }
    }

    private struct RestaurantResolution: Decodable {
        let kind: String
        let restaurantId: String?
        let restaurantName: String?
        let url: String?
    }

    private func resolveUniversalLink(_ link: PendingUniversalLink) async {
        let path: String
        switch link {
        case .touchpoint(let code): path = "/api/portal/resolve-touchpoint/\(code)"
        case .referral(let code, let channel): path = "/api/portal/resolve-referral/\(code)?via=\(channel.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "direct")"
        }
        guard let url = URL(string: path, relativeTo: Config.apiBaseURL) else { return }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                universalLinkError = isFrench ? "Ce lien n'est plus valide." : "This link is no longer valid."
                return
            }
            let resolved = try JSONDecoder().decode(RestaurantResolution.self, from: data)
            if resolved.kind == "external", let urlString = resolved.url, let externalUrl = URL(string: urlString) {
                await UIApplication.shared.open(externalUrl)
            } else if resolved.kind == "restaurant", let id = resolved.restaurantId {
                resolvedLinkRestaurant = ResolvedUniversalLinkRestaurant(id: id, name: resolved.restaurantName ?? "Restaurant")
            }
        } catch {
            universalLinkError = isFrench ? "Ce lien n'est plus valide." : "This link is no longer valid."
            AppLog.failure("resolveUniversalLink", error)
        }
    }

    private func syncScreen() {
        let hasSeenOnboarding = UserDefaults.standard.bool(forKey: onboardingKey)
        let hasCompletedOwnerSetup = UserDefaults.standard.bool(forKey: ownerSetupKey)
        let ownerHasRealName = supabase.selectedOwnerRestaurant.map { name in
            let normalized = name.name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            return !normalized.isEmpty && normalized != "mon restaurant" && normalized != "minerva flow"
        } ?? false
        if supabase.isOwnerExperience && ownerHasRealName && !hasCompletedOwnerSetup {
            UserDefaults.standard.set(true, forKey: ownerSetupKey)
        }
        let target: RootScreen
        if !supabase.isAuthenticated {
            target = screen == .auth ? .auth : .intro
        } else if supabase.isResolvingExperience {
            target = .resolvingSession
        } else if supabase.experienceResolutionError != nil {
            target = .resolutionError
        } else if supabase.isTeamExperience {
            target = .teamMain
        } else if supabase.isOwnerExperience {
            target = (hasCompletedOwnerSetup || ownerHasRealName) ? .ownerMain : .ownerOnboarding
        } else if supabase.customer == nil {
            target = .restaurantOnboarding
        } else {
            target = hasSeenOnboarding ? .main : .onboarding
        }
        transition(to: target)
    }

    private func maybeSignInUITestUser() {
#if DEBUG
        guard !didStartUITestSignIn,
              ProcessInfo.processInfo.arguments.contains("-minervaUITestAuth") else { return }
        didStartUITestSignIn = true
        Task {
            do {
                try await supabase.signInWithDevTestAccount()
            } catch {
                AppLog.failure("uiTestSignIn", error)
            }
        }
#endif
    }

    /// Scope the one-time tour to the authenticated account. A shared
    /// device used for owner/client TestFlight testing must not let one
    /// account suppress onboarding for the next account.
    private var onboardingKey: String {
        guard let id = supabase.authUserID?.uuidString else { return hasSeenOnboardingKey }
        return "\(hasSeenOnboardingKey).\(id)"
    }

    private var ownerSetupKey: String {
        guard let id = supabase.authUserID?.uuidString else { return "hasCompletedOwnerSetup" }
        return "hasCompletedOwnerSetup.\(id)"
    }

    private func transition(to target: RootScreen) {
        withAnimation(.easeInOut(duration: 0.35)) {
            screen = target
        }
    }

    @ViewBuilder
    private func resolutionView(isError: Bool) -> some View {
        VStack(spacing: 16) {
            if isError {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.mv(size: 30))
                    .foregroundStyle(.orange)
                Text(isFrench ? "Impossible de préparer votre espace" : "We couldn't prepare your workspace")
                    .font(MinervaFont.display(24))
                    .foregroundStyle(MinervaColor.ink)
                    .multilineTextAlignment(.center)
                Text(supabase.experienceResolutionError ?? (isFrench ? "Réessayez dans un instant." : "Try again in a moment."))
                    .font(.mv(size: 14))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                Button(isFrench ? "Réessayer" : "Try again") {
                    Task { await supabase.retryExperienceResolution() }
                }
                .buttonStyle(.borderedProminent)
                .tint(MinervaColor.emeraldDark)
            } else {
                ProgressView()
                    .tint(MinervaColor.emerald)
                Text(isFrench ? "Préparation de votre espace…" : "Preparing your workspace…")
                    .font(.mv(size: 15, weight: .medium))
                    .foregroundStyle(MinervaColor.inkSoft)
            }
        }
        .padding(28)
    }
}

/// A first-time customer cannot enter the app shell until a restaurant
/// membership exists. The acquisition model is QR-first, so this required
/// step opens the existing restaurant scanner and its real "Devenir client"
/// confirmation; there is intentionally no skip action into empty pages.
private struct RestaurantConnectionOnboardingView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var showingScanner = false

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        ZStack {
            MinervaColor.cream.ignoresSafeArea()
            VStack(spacing: 24) {
                HStack(spacing: 9) {
                    Image("LogoMark")
                        .resizable()
                        .frame(width: 32, height: 32)
                        .accessibilityHidden(true)
                    Text("Minerva Flow")
                        .font(MinervaFont.display(20, weight: .semibold))
                        .italic(isFrench)
                        .foregroundStyle(MinervaColor.ink)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Minerva Flow")

                Spacer(minLength: 24)

                Image(systemName: "qrcode.viewfinder")
                    .font(.system(size: 58, weight: .light))
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .accessibilityHidden(true)

                VStack(spacing: 9) {
                    Text(isFrench ? "Reliez votre compte à un restaurant" : "Connect your account to a restaurant")
                        .font(MinervaFont.display(27, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .multilineTextAlignment(.center)
                    Text(isFrench
                        ? "Scannez le code QR Minerva Flow affiché par le restaurant. Vous pourrez ensuite consulter sa carte, vos points et vos récompenses."
                        : "Scan the Minerva Flow QR code displayed by the restaurant. Then you can view its card, your points and rewards.")
                        .font(.mv(size: 14))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Button {
                    showingScanner = true
                } label: {
                    Label(isFrench ? "Scanner le code du restaurant" : "Scan the restaurant code", systemImage: "camera.viewfinder")
                        .font(.mv(size: 15, weight: .semibold))
                        .frame(maxWidth: .infinity, minHeight: 52)
                }
                .buttonStyle(.borderedProminent)
                .tint(MinervaColor.emeraldDark)

                Text(isFrench
                    ? "Demandez le code à l’équipe du restaurant. Vous pourrez changer de restaurant ou en ajouter d’autres plus tard."
                    : "Ask the restaurant team for its code. You can switch restaurants or add more later.")
                    .font(.mv(size: 12))
                    .foregroundStyle(MinervaColor.inkFaint)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)

                Button(isFrench ? "Changer de compte" : "Switch account") {
                    Task { await supabase.signOut() }
                }
                .font(.mv(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.emeraldDark)

                Spacer(minLength: 24)
            }
            .padding(28)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .fullScreenCover(isPresented: $showingScanner) {
            ScanToOrderView(showsCloseButton: true, purpose: .restaurantConnection)
        }
    }
}

struct NativeRealtimeStatusPill: View {
    @EnvironmentObject private var supabase: SupabaseManager
    let isFrench: Bool

    private var title: String {
        switch supabase.realtimeStatus {
        case "live": return isFrench ? "En direct" : "Live"
        case "connecting": return isFrench ? "Connexion…" : "Connecting…"
        case "reconnecting": return isFrench ? "Reconnexion…" : "Reconnecting…"
        case "offline": return isFrench ? "Hors ligne" : "Offline"
        default: return isFrench ? "En attente" : "Waiting"
        }
    }

    private var color: Color {
        switch supabase.realtimeStatus {
        case "live": return MinervaColor.emeraldDark
        case "offline": return .red
        case "connecting", "reconnecting": return .orange
        default: return MinervaColor.inkFaint
        }
    }

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(title).font(.mv(size: 10, weight: .medium))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(color.opacity(0.08), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isFrench ? "État de la connexion temps réel : \(title)" : "Realtime connection: \(title)")
    }
}

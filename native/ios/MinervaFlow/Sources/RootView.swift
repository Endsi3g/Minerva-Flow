import SwiftUI

private let hasSeenOnboardingKey = "hasSeenTierOnboarding"

private enum RootScreen { case intro, auth, resolvingSession, resolutionError, restaurantOnboarding, customerProfile, onboarding, ownerOnboarding, main, ownerMain, teamMain }

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

    @State private var screen: RootScreen = .restaurantOnboarding
    @State private var enrollmentRestaurant: NativeEnrollmentRestaurant?
    @State private var isJoiningRestaurant = false
    @State private var resolvedLinkRestaurant: ResolvedUniversalLinkRestaurant?
    @State private var universalLinkError: String?
#if DEBUG
    @State private var didStartUITestSignIn = false
    // A prior test's persisted session must not become an interactive screen
    // while the harness is signing out and authenticating its next real account.
    @State private var isPreparingUITestSession = (ProcessInfo.processInfo.arguments.contains("-minervaUITestAuth") || ProcessInfo.processInfo.arguments.contains("-minervaUITestSignedOut"))
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

    @ViewBuilder private var screenContent: some View {
            switch screen {
            case .intro:
                enrollmentView
                    .id(RootScreen.intro)
                    .transition(.opacity)
            case .auth:
                AuthView(restaurantName: enrollmentRestaurant?.name, isOwnerLogin: supabase.requestedOwnerAccess,
                         onBack: { enrollmentRestaurant = nil; supabase.requestedOwnerAccess = false; transition(to: .restaurantOnboarding) })
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
                enrollmentView
                    .id(RootScreen.restaurantOnboarding)
                    .transition(.opacity)
            case .customerProfile:
                CustomerFirstNameView()
                    .id(RootScreen.customerProfile)
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

    private var sessionContent: some View {
        ZStack { screenContent }
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
        .onChange(of: supabase.customer?.name) { syncScreen() }
        .onChange(of: supabase.isOwnerExperience) { syncScreen() }
        .onChange(of: supabase.isManagingRestaurant) { syncScreen() }
        .onChange(of: supabase.isTeamExperience) { syncScreen() }
        .onChange(of: supabase.isResolvingExperience) { syncScreen(); applyPendingNotificationIfReady(); completeEnrollmentIfReady() }
        .onChange(of: supabase.experienceResolutionError) { syncScreen() }
        // Only ever covers .main — the lock protects the loyalty account's
        // data, not the login/onboarding screens that precede having one.
        .fullScreenCover(isPresented: Binding(
            get: { (screen == .main || screen == .ownerMain) && biometricLock.isLocked },
            set: { _ in }
        )) {
            BiometricLockView()
        }
    }

    var body: some View {
        sessionContent
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
        guard screen == .main, let link = router.pendingUniversalLink else { return }
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
#if DEBUG
        if isPreparingUITestSession {
            transition(to: .resolvingSession)
            return
        }
#endif
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
            target = screen == .auth ? .auth : .restaurantOnboarding
        } else if supabase.isResolvingExperience || isJoiningRestaurant {
            target = .resolvingSession
        } else if supabase.experienceResolutionError != nil {
            target = .resolutionError
        } else if supabase.isTeamExperience {
            target = .teamMain
        } else if supabase.isOwnerExperience && supabase.isManagingRestaurant {
            target = (hasCompletedOwnerSetup || ownerHasRealName) ? .ownerMain : .ownerOnboarding
        } else if supabase.customer == nil {
            target = .restaurantOnboarding
        } else if let customer = supabase.customer, customer.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || customer.name.lowercased() == customer.email?.lowercased() {
            target = .customerProfile
        } else {
            // Restaurant selection and email verification already introduced
            // the account. Open its actual workspace without a second carousel.
            target = .main
        }
        transition(to: target)
    }

    private var enrollmentView: some View {
        EnrollmentSelectionView(onSelect: { restaurant in
            enrollmentRestaurant = restaurant
            supabase.requestedOwnerAccess = false
            if supabase.isAuthenticated { completeEnrollmentIfReady() }
            else { transition(to: .auth) }
        }, onSignIn: {
            if supabase.isAuthenticated { Task { await supabase.signOut() } }
            else { transition(to: .auth) }
        })
    }

    private func completeEnrollmentIfReady() {
        guard supabase.isAuthenticated, !supabase.isResolvingExperience, !isJoiningRestaurant,
              !supabase.isManagingRestaurant, let restaurant = enrollmentRestaurant else { return }
        isJoiningRestaurant = true
        syncScreen()
        Task {
            let joined = await supabase.joinRestaurant(restaurant.id)
            isJoiningRestaurant = false
            if joined { enrollmentRestaurant = nil }
            syncScreen()
        }
    }

    private func maybeSignInUITestUser() {
#if DEBUG
        guard !didStartUITestSignIn,
              (ProcessInfo.processInfo.arguments.contains("-minervaUITestAuth") || ProcessInfo.processInfo.arguments.contains("-minervaUITestSignedOut")) else { return }
        didStartUITestSignIn = true
        Task {
            do {
                if ProcessInfo.processInfo.arguments.contains("-minervaUITestSignedOut") {
                    await supabase.signOut()
                } else {
                    await supabase.signOut()
                    try await supabase.signInWithDevTestAccount()
                }
            } catch {
                AppLog.failure("uiTestSignIn", error)
            }
            isPreparingUITestSession = false
            syncScreen()
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
        guard screen != target else { return }
        Analytics.screen("root_\(target)")
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

private struct CustomerFirstNameView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage("appLanguage") private var language = AppLanguage.fr.rawValue
    @State private var name = ""
    @State private var busy = false
    @State private var failed = false
    private var french: Bool { language != AppLanguage.en.rawValue }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Minerva Flow").font(.mv(size: 17, weight: .semibold))
                Text(french ? "Bienvenue" : "Welcome").font(MinervaFont.display(34))
                Text(french ? "Votre courriel est vérifié. Comment devons-nous vous appeler ?" : "Your email is verified. What should we call you?")
                    .font(.mv(size: 15)).foregroundStyle(MinervaColor.inkSoft)
                TextField(french ? "Prénom" : "First name", text: $name)
                    .textContentType(.givenName).autocorrectionDisabled().textInputAutocapitalization(.words)
                    .font(.mv(size: 17)).padding(16).background(MinervaColor.surface, in: RoundedRectangle(cornerRadius: 14))
                    .accessibilityIdentifier("customerFirstName").disabled(busy)
                    .onChange(of: name) { _, value in if value.count > 80 { name = String(value.prefix(80)) } }
                if failed {
                    Text(french ? "Votre prénom n’a pas pu être enregistré. Réessayez." : "Your first name could not be saved. Please retry.")
                        .font(.mv(size: 14)).foregroundStyle(.red)
                }
                Button {
                    busy = true; failed = false
                    Task { failed = !(await supabase.completeCustomerFirstName(name)); busy = false }
                } label: {
                    Text(busy ? (french ? "Un instant…" : "One moment…") : (french ? "Ouvrir mon espace client" : "Open my customer account"))
                        .font(.mv(size: 16, weight: .semibold)).frame(maxWidth: .infinity).padding(16)
                }
                .background(MinervaColor.emerald, in: RoundedRectangle(cornerRadius: 14)).foregroundStyle(.white)
                .buttonStyle(PressableButtonStyle()).accessibilityIdentifier("completeCustomerFirstName")
                .disabled(busy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                Button(french ? "Changer de compte" : "Change account") { Task { await supabase.signOut() } }
                    .font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft).frame(maxWidth: .infinity, minHeight: 44).disabled(busy)
            }.padding(28).padding(.top, 50)
        }.background(MinervaColor.cream).foregroundStyle(MinervaColor.ink)
    }
}

/// A first-time customer cannot enter the app shell until a restaurant
/// membership exists. The acquisition model is QR-first, so this required
/// step opens the existing restaurant scanner and its real "Devenir client"
/// confirmation; there is intentionally no skip action into empty pages.

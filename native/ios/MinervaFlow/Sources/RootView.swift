import SwiftUI

private let hasSeenOnboardingKey = "hasSeenTierOnboarding"

private enum RootScreen { case intro, auth, onboarding, main }

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

    @State private var screen: RootScreen = .intro
    @State private var resolvedLinkRestaurant: ResolvedUniversalLinkRestaurant?
    @State private var universalLinkError: String?

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
            case .onboarding:
                OnboardingWelcomeView {
                    UserDefaults.standard.set(true, forKey: hasSeenOnboardingKey)
                    transition(to: .main)
                }
                .id(RootScreen.onboarding)
                .transition(.opacity)
            case .main:
                MainTabView()
                    .id(RootScreen.main)
                    .transition(.opacity)
            }
        }
        .onAppear {
            syncScreen()
            if screen == .main { biometricLock.lockIfEnabled() }
        }
        .onChange(of: supabase.isAuthenticated) { syncScreen() }
        // Only ever covers .main — the lock protects the loyalty account's
        // data, not the login/onboarding screens that precede having one.
        .fullScreenCover(isPresented: Binding(
            get: { screen == .main && biometricLock.isLocked },
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
        .alert("Lien invalide", isPresented: Binding(
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
        case .referral(let code): path = "/api/portal/resolve-referral/\(code)"
        }
        guard let url = URL(string: path, relativeTo: Config.apiBaseURL) else { return }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                universalLinkError = "Ce lien n'est plus valide."
                return
            }
            let resolved = try JSONDecoder().decode(RestaurantResolution.self, from: data)
            if resolved.kind == "external", let urlString = resolved.url, let externalUrl = URL(string: urlString) {
                await UIApplication.shared.open(externalUrl)
            } else if resolved.kind == "restaurant", let id = resolved.restaurantId {
                resolvedLinkRestaurant = ResolvedUniversalLinkRestaurant(id: id, name: resolved.restaurantName ?? "Restaurant")
            }
        } catch {
            universalLinkError = "Ce lien n'est plus valide."
            print("resolveUniversalLink error: \(error)")
        }
    }

    private func syncScreen() {
        let hasSeenOnboarding = UserDefaults.standard.bool(forKey: hasSeenOnboardingKey)
        let target: RootScreen = supabase.isAuthenticated
            ? (hasSeenOnboarding ? .main : .onboarding)
            : (screen == .auth ? .auth : .intro)
        transition(to: target)
    }

    private func transition(to target: RootScreen) {
        withAnimation(.easeInOut(duration: 0.35)) {
            screen = target
        }
    }
}

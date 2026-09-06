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
struct RootView: View {
    @EnvironmentObject var supabase: SupabaseManager

    @State private var screen: RootScreen = .intro

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
        .onAppear { syncScreen() }
        .onChange(of: supabase.isAuthenticated) { syncScreen() }
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

import Foundation

enum AppTab: Int {
    case home, order, rewards, profile
}

/// Routes minervaflow:// URLs (currently only the home-screen widget's tap
/// targets — see MinervaFlowWidget.swift's own WidgetDeepLink) to a tab
/// selection MainTabView can consume. A tiny dedicated object rather than
/// more state on SupabaseManager: this is pure UI routing, unrelated to
/// data loading, and keeping it separate means MainTabView doesn't need
/// to observe the whole data manager just to read one pending-tab value.
@MainActor
final class DeepLinkRouter: ObservableObject {
    static let shared = DeepLinkRouter()

    @Published var pendingTab: AppTab?

    func handle(_ url: URL) {
        // login-callback (OAuth) is consumed directly by
        // ASWebAuthenticationSession inside signInWithOAuth, never
        // reaching here in practice — this guard just makes that
        // assumption explicit rather than silently routing it as "home".
        guard url.host != "login-callback" else { return }

        switch url.host {
        case "rewards": pendingTab = .rewards
        case "order", "commander": pendingTab = .order
        case "profile", "profil": pendingTab = .profile
        default: pendingTab = .home
        }
    }
}

import Foundation

enum AppTab: Int {
    case home, order, scan, rewards, profile
}

/// A resolved-later reference to a /t/{code} touchpoint or /p/{code}
/// referral link tapped via Universal Links (see
/// MinervaFlow.entitlements' applinks:minervaflow.app and
/// app/.well-known/apple-app-site-association's route.ts). Equatable so
/// RootView can observe it with .onChange.
enum PendingUniversalLink: Equatable {
    case touchpoint(code: String)
    case referral(code: String)
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
    @Published var pendingUniversalLink: PendingUniversalLink?

    /// Universal Link arrival (NSUserActivityTypeBrowsingWeb) — a tap on a
    /// /t/{code} or /p/{code} link that iOS verified belongs to this app
    /// (see the entitlement + AASA file) and opened directly instead of
    /// Safari. Locale prefix is optional (fr unprefixed, en/tr prefixed —
    /// i18n/routing.ts's localePrefix "as-needed"), so it's stripped first
    /// if present.
    func handleUniversalLink(_ url: URL) {
        var segments = url.pathComponents.filter { $0 != "/" }
        if let first = segments.first, ["en", "tr"].contains(first) {
            segments.removeFirst()
        }
        guard segments.count == 2, let code = segments.last else { return }
        switch segments.first {
        case "t": pendingUniversalLink = .touchpoint(code: code)
        case "p": pendingUniversalLink = .referral(code: code)
        default: break
        }
    }

    func handle(_ url: URL) {
        // login-callback (OAuth) is consumed directly by
        // ASWebAuthenticationSession inside signInWithOAuth, never
        // reaching here in practice — this guard just makes that
        // assumption explicit rather than silently routing it as "home".
        guard url.host != "login-callback" else { return }

        switch url.host {
        case "rewards": pendingTab = .rewards
        case "order", "commander": pendingTab = .order
        case "scan", "scanner": pendingTab = .scan
        case "profile", "profil": pendingTab = .profile
        default: pendingTab = .home
        }
    }
}

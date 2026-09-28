import Foundation

enum AppTab: Int {
    case home, order, scan, rewards, cards, profile
}

/// A resolved-later reference to a /t/{code} touchpoint or /p/{code}
/// referral link tapped via Universal Links (see
/// MinervaFlow.entitlements' applinks:minervaflow.app and
/// app/.well-known/apple-app-site-association's route.ts). Equatable so
/// RootView can observe it with .onChange.
enum PendingUniversalLink: Equatable {
    case touchpoint(code: String)
    case referral(code: String, channel: String)
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
    @Published var pendingOwnerSection: Int?
    @Published var pendingNotificationLink: String?
    @Published var pendingUniversalLink: PendingUniversalLink?
    @Published var googleBusinessProfileStatus: String?
    @Published var googleBusinessProfileReason: String?

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
        case "p": pendingUniversalLink = .referral(code: code, channel: URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "via" })?.value ?? "direct")
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
        case "google-business-profile":
            googleBusinessProfileStatus = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "status" })?.value
            googleBusinessProfileReason = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "reason" })?.value
        case "rewards": pendingTab = .rewards
        case "cards", "mes-cartes": pendingTab = .cards
        case "order", "commander": pendingTab = .order
        case "scan", "scanner": pendingTab = .scan
        case "profile", "profil": pendingTab = .profile
        default: pendingTab = .home
        }
    }

    /// APNs payloads carry the same relative web links as in-app alerts.
    /// Resolve known destinations into native sections instead of opening
    /// a web URL inside the app.
    func handleNotificationLink(_ rawLink: String?, isOwner: Bool) {
        guard let rawLink, !rawLink.isEmpty else {
            if isOwner { pendingOwnerSection = 0 } else { pendingTab = .home }
            return
        }
        let path: String
        if let url = URL(string: rawLink), let host = url.host {
            path = url.path.isEmpty ? "/" + host : url.path
        } else {
            path = rawLink.hasPrefix("/") ? rawLink : "/\(rawLink)"
        }
        let normalized = path.lowercased()
        switch true {
        case normalized.contains("/commandes") || normalized.contains("/orders"):
            if isOwner { pendingOwnerSection = 1 } else { pendingTab = .order }
        case normalized.contains("/menu"):
            if isOwner { pendingOwnerSection = 2 } else { pendingTab = .order }
        case normalized.contains("/fidelisation") || normalized.contains("/rewards") || normalized.contains("/loyalty"):
            if isOwner { pendingOwnerSection = 3 } else { pendingTab = .rewards }
        case normalized.contains("/inventaire") || normalized.contains("/inventory") || normalized.contains("/finance"):
            if isOwner { pendingOwnerSection = 4 } else { pendingTab = .profile }
        default:
            if isOwner { pendingOwnerSection = 0 } else { pendingTab = .home }
        }
    }
}

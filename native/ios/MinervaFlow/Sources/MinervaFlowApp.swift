import SwiftUI
import Sentry

@main
struct MinervaFlowApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var supabase = SupabaseManager.shared
    @StateObject private var biometricLock = BiometricLock.shared
    @StateObject private var locationManager = LocationManager.shared
    @StateObject private var notificationManager = NotificationManager.shared
    @StateObject private var deepLinkRouter = DeepLinkRouter.shared
    @Environment(\.scenePhase) private var scenePhase

    init() {
        // Harmless no-op until Config.sentryDSN is filled in (see its own
        // comment) — the web app already has a real Sentry organization,
        // this just hasn't been pointed at an iOS project within it yet.
        if !Config.sentryDSN.isEmpty {
            SentrySDK.start { options in
                options.dsn = Config.sentryDSN
                options.debug = false
                #if DEBUG
                options.environment = "debug"
                #else
                options.environment = "production"
                #endif
            }
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(supabase)
                .environmentObject(biometricLock)
                .environmentObject(locationManager)
                .environmentObject(notificationManager)
                .environmentObject(deepLinkRouter)
                // Minerva Flow's brand (AGENTS.md) only defines one light
                // cream/emerald palette — no dark variant exists yet, same
                // as the web app. Forcing light avoids every color in this
                // app silently inheriting Dark Mode defaults (the invisible
                // white-on-cream input text bug came from exactly this).
                .preferredColorScheme(.light)
                .onOpenURL { url in
                    deepLinkRouter.handle(url)
                }
        }
        .onChange(of: scenePhase) { _, newPhase in
            // Re-lock on every return to foreground, not just cold launch —
            // a phone left on a table with the app backgrounded is exactly
            // the scenario this feature exists for.
            if newPhase == .active {
                biometricLock.lockIfEnabled()
            }
        }
    }
}

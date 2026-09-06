import SwiftUI

@main
struct MinervaFlowApp: App {
    @StateObject private var supabase = SupabaseManager.shared
    @StateObject private var biometricLock = BiometricLock.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(supabase)
                .environmentObject(biometricLock)
                // Minerva Flow's brand (AGENTS.md) only defines one light
                // cream/emerald palette — no dark variant exists yet, same
                // as the web app. Forcing light avoids every color in this
                // app silently inheriting Dark Mode defaults (the invisible
                // white-on-cream input text bug came from exactly this).
                .preferredColorScheme(.light)
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

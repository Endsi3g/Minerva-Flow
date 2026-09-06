import SwiftUI

@main
struct MinervaFlowApp: App {
    @StateObject private var supabase = SupabaseManager.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(supabase)
                // Minerva Flow's brand (AGENTS.md) only defines one light
                // cream/emerald palette — no dark variant exists yet, same
                // as the web app. Forcing light avoids every color in this
                // app silently inheriting Dark Mode defaults (the invisible
                // white-on-cream input text bug came from exactly this).
                .preferredColorScheme(.light)
        }
    }
}

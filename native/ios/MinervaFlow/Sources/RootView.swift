import SwiftUI

struct RootView: View {
    @EnvironmentObject var supabase: SupabaseManager

    var body: some View {
        Group {
            if supabase.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
    }
}

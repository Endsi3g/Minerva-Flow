import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var supabase: SupabaseManager

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Accueil", systemImage: "house.fill") }

            ComingSoonView(title: "Commander", systemImage: "fork.knife")
                .tabItem { Label("Commander", systemImage: "fork.knife") }

            ComingSoonView(title: "Récompenses", systemImage: "gift.fill")
                .tabItem { Label("Récompenses", systemImage: "gift.fill") }

            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.fill") }
        }
        .tint(MinervaColor.emeraldDark)
    }
}

/// Phase 1 ships the Home tab with real data; Order and Rewards get their
/// own screens in Phase 2 (see the phase plan) — this placeholder keeps the
/// 4-tab shell honest about what's actually built rather than a dead tap.
struct ComingSoonView: View {
    let title: String
    let systemImage: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 32))
                .foregroundStyle(MinervaColor.inkFaint)
            Text(title)
                .font(MinervaFont.display(20))
                .foregroundStyle(MinervaColor.ink)
            Text("Arrive en phase 2.")
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MinervaColor.cream.ignoresSafeArea())
    }
}

struct ProfileView: View {
    @EnvironmentObject var supabase: SupabaseManager

    var body: some View {
        VStack(spacing: 20) {
            if let customer = supabase.customer {
                VStack(spacing: 4) {
                    Text(customer.name)
                        .font(MinervaFont.display(20))
                    Text("\(customer.visitCount) visites · \(customer.loyaltyPoints) points")
                        .font(.system(size: 13))
                        .foregroundStyle(MinervaColor.inkSoft)
                }
            }

            Button("Se déconnecter") {
                Task { await supabase.signOut() }
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.red)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MinervaColor.cream.ignoresSafeArea())
    }
}

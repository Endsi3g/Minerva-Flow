import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Accueil", systemImage: "house.fill") }

            ComingSoonView(title: "Commander", systemImage: "fork.knife")
                .tabItem { Label("Commander", systemImage: "fork.knife") }

            RewardsView()
                .tabItem { Label("Récompenses", systemImage: "gift.fill") }

            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.fill") }
        }
        .tint(MinervaColor.emeraldDark)
    }
}

/// Order requires a real backend bridge (Server Actions aren't callable
/// from native) that hasn't been built yet — this placeholder keeps the
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
            Text("Arrive bientôt.")
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MinervaColor.cream.ignoresSafeArea())
    }
}

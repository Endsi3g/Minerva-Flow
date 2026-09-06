import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Accueil", systemImage: "house.fill") }

            MenuView()
                .tabItem { Label("Commander", systemImage: "fork.knife") }

            RewardsView()
                .tabItem { Label("Récompenses", systemImage: "gift.fill") }

            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.fill") }
        }
        .tint(MinervaColor.emeraldDark)
    }
}

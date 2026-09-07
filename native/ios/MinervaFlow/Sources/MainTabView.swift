import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var router: DeepLinkRouter
    @State private var selection: AppTab = .home

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label("Accueil", systemImage: "house.fill") }
                .tag(AppTab.home)

            MenuView()
                .tabItem { Label("Commander", systemImage: "fork.knife") }
                .tag(AppTab.order)

            RewardsView()
                .tabItem { Label("Récompenses", systemImage: "gift.fill") }
                .tag(AppTab.rewards)

            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.fill") }
                .tag(AppTab.profile)
        }
        .tint(MinervaColor.emeraldDark)
        // A widget tap can arrive before this view even exists (the app
        // was cold-launched by the tap itself), in which case
        // DeepLinkRouter already has pendingTab set by the time we appear
        // — onChange alone would miss that, since it only fires on values
        // that change *after* this view starts observing.
        .onAppear { applyPendingTabIfNeeded() }
        .onChange(of: router.pendingTab) { _, _ in applyPendingTabIfNeeded() }
    }

    private func applyPendingTabIfNeeded() {
        guard let pending = router.pendingTab else { return }
        selection = pending
        router.pendingTab = nil
    }
}

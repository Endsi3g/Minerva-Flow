import SwiftUI

private let lastSeenSurveyBuildKey = "lastSeenSurveyBuild"

struct MainTabView: View {
    @EnvironmentObject var router: DeepLinkRouter
    @EnvironmentObject var supabase: SupabaseManager
    @State private var selection: AppTab = .home
    @State private var showVersionSurvey = false
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label(isFrench ? "Accueil" : "Home", systemImage: "house.fill") }
                .tag(AppTab.home)

            MenuView()
                .tabItem { Label(isFrench ? "Commander" : "Order", systemImage: "fork.knife") }
                .tag(AppTab.order)

            ScannerTabView()
                .tabItem { Label(isFrench ? "Scanner" : "Scan", systemImage: "qrcode.viewfinder") }
                .tag(AppTab.scan)

            RewardsView()
                .tabItem { Label(isFrench ? "Offres" : "Offers", systemImage: "gift.fill") }
                .tag(AppTab.rewards)

            MembershipCardsView()
                .tabItem { Label(isFrench ? "Mes cartes" : "My cards", systemImage: "creditcard.fill") }
                .tag(AppTab.cards)

            ProfileView()
                .tabItem { Label(isFrench ? "Plus" : "More", systemImage: "ellipsis.circle.fill") }
                .tag(AppTab.profile)
        }
        .tint(MinervaColor.emeraldDark)
        // A widget tap can arrive before this view even exists (the app
        // was cold-launched by the tap itself), in which case
        // DeepLinkRouter already has pendingTab set by the time we appear
        // — onChange alone would miss that, since it only fires on values
        // that change *after* this view starts observing.
        .onAppear {
            applyPendingTabIfNeeded()
            checkVersionBumpSurvey()
        }
        .onChange(of: router.pendingTab) { _, _ in applyPendingTabIfNeeded() }
        .onChange(of: selection) { _, _ in
            // A failed request belongs to the screen that made it. Never
            // replay that error as the user navigates to another tab.
            supabase.lastError = nil
        }
        .sheet(isPresented: $showVersionSurvey) {
            SurveyView()
        }
    }

    private func applyPendingTabIfNeeded() {
        guard let pending = router.pendingTab else { return }
        selection = pending
        router.pendingTab = nil
    }

    /// Prompts the survey once per new build — not on a brand-new install
    /// (nothing stored yet, so this just records the current build without
    /// interrupting a first-time user), and with a short delay so it never
    /// competes with the tab view's own appearance animation.
    private func checkVersionBumpSurvey() {
        guard let currentBuild = Bundle.main.infoDictionary?["CFBundleVersion"] as? String else { return }
        let defaults = UserDefaults.standard
        let lastSeenBuild = defaults.string(forKey: lastSeenSurveyBuildKey)
        defaults.set(currentBuild, forKey: lastSeenSurveyBuildKey)

        guard let lastSeenBuild, lastSeenBuild != currentBuild else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            showVersionSurvey = true
        }
    }
}

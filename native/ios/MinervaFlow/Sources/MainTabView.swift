import SwiftUI

private let lastSeenSurveyBuildKey = "lastSeenSurveyBuild"

struct MainTabView: View {
    @EnvironmentObject var router: DeepLinkRouter
    @EnvironmentObject var supabase: SupabaseManager
    @State private var selection: AppTab = .home
    @State private var showVersionSurvey = false
    @State private var showScanner = false
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        tabContainer
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
        .sheet(isPresented: $showScanner) { ScannerTabView() }
    }

    /// Same bottom tab bar on iPhone and iPad (no side rail).
    @ViewBuilder private var tabContainer: some View {
        if #available(iOS 18.0, *) {
            tabView.tabViewStyle(.tabBarOnly)
        } else {
            tabView
        }
    }

    private var tabView: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label(isFrench ? "Accueil" : "Home", systemImage: "house.fill") }
                .tag(AppTab.home)

            MenuView()
                .tabItem { Label("Menu", systemImage: "fork.knife") }
                .tag(AppTab.order)

            NavigationStack { OrderHistoryView() }
                .tabItem { Label(isFrench ? "Commandes" : "Orders", systemImage: "bag.fill") }
                .tag(AppTab.orders)

            RewardsView()
                .tabItem { Label(isFrench ? "Fidélité" : "Loyalty", systemImage: "heart.fill") }
                .tag(AppTab.rewards)

            ProfileView()
                .tabItem { Label(isFrench ? "Compte" : "Account", systemImage: "person.crop.circle.fill") }
                .tag(AppTab.profile)
        }
    }

    private func applyPendingTabIfNeeded() {
        guard let pending = router.pendingTab else { return }
        // On phones "Mes cartes" lives inside Compte (five tabs fit the bar;
        // a sixth made iOS hide two of them behind a plain "Autre" list).
        if pending == .scan {
            showScanner = true
        } else if pending == .cards {
            router.pendingCompteRoute = .cards
            selection = .profile
        } else {
            selection = pending
        }
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

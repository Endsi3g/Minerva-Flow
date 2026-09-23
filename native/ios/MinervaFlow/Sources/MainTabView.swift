import SwiftUI

private let lastSeenSurveyBuildKey = "lastSeenSurveyBuild"

struct MainTabView: View {
    @EnvironmentObject var router: DeepLinkRouter
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selection: AppTab = .home
    @State private var showVersionSurvey = false
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        Group {
          if horizontalSizeClass == .regular {
            NavigationSplitView {
                List {
                    tabletTab(.home, title: isFrench ? "Accueil" : "Home", icon: "house.fill")
                    tabletTab(.order, title: isFrench ? "Commander" : "Order", icon: "fork.knife")
                    tabletTab(.scan, title: isFrench ? "Scanner" : "Scan", icon: "qrcode.viewfinder")
                    tabletTab(.rewards, title: isFrench ? "Offres" : "Offers", icon: "gift.fill")
                    tabletTab(.cards, title: isFrench ? "Mes cartes" : "My cards", icon: "creditcard.fill")
                    tabletTab(.profile, title: isFrench ? "Plus" : "More", icon: "ellipsis.circle.fill")
                }
                .listStyle(.sidebar)
                .navigationTitle("Minerva Flow")
                .navigationSplitViewColumnWidth(min: 220, ideal: 260)
            } detail: {
                selectedContent
                    .frame(maxWidth: 1100)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .navigationSplitViewStyle(.balanced)
          } else {
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
          }
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

    private func tabletTab(_ tab: AppTab, title: String, icon: String) -> some View {
        Button { selection = tab } label: {
            Label(title, systemImage: icon).frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(selection == tab ? MinervaColor.emerald.opacity(0.14) : Color.clear)
    }

    @ViewBuilder
    private var selectedContent: some View {
        switch selection {
        case .home: HomeView()
        case .order: MenuView()
        case .scan: ScannerTabView()
        case .rewards: RewardsView()
        case .cards: MembershipCardsView()
        case .profile: ProfileView()
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

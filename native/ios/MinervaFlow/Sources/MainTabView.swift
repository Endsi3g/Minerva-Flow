import SwiftUI

private let lastSeenSurveyBuildKey = "lastSeenSurveyBuild"

struct MainTabView: View {
    @EnvironmentObject var router: DeepLinkRouter
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selection: AppTab = .home
    @State private var showVersionSurvey = false
    @State private var showScanner = false
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        Group {
          if horizontalSizeClass == .regular {
            // Hand-built sidebar: NavigationSplitView re-ran its update pass
            // endlessly on iPad and pinned the CPU.
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 10) {
                        Image("LogoMark").resizable().frame(width: 32, height: 32).accessibilityHidden(true)
                        Text("Minerva Flow").font(.mv(size: 18, weight: .semibold))
                    }
                    .padding(.horizontal, 20).padding(.top, 28).padding(.bottom, 20)
                    VStack(spacing: 4) {
                        tabletTab(.home, title: isFrench ? "Accueil" : "Home", icon: "house.fill")
                        tabletTab(.order, title: "Menu", icon: "fork.knife")
                        tabletTab(.orders, title: isFrench ? "Commandes" : "Orders", icon: "bag.fill")
                        tabletTab(.rewards, title: isFrench ? "Fidélité" : "Loyalty", icon: "heart.fill")
                        tabletTab(.cards, title: isFrench ? "Mes cartes" : "My cards", icon: "creditcard.fill")
                        tabletTab(.profile, title: isFrench ? "Compte" : "Account", icon: "person.crop.circle.fill")
                    }
                    .padding(.horizontal, 12)
                    Spacer(minLength: 12)
                }
                .frame(width: 260)
                .frame(maxHeight: .infinity)
                .background(MinervaColor.creamSoft.ignoresSafeArea())
                Rectangle().fill(MinervaColor.border).frame(width: 1)
                selectedContent
                    .id(selection)
                    .frame(maxWidth: 1100)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(MinervaColor.cream.ignoresSafeArea())
            }
            .background(MinervaColor.cream.ignoresSafeArea())
          } else {
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
        .sheet(isPresented: $showScanner) { ScannerTabView() }
    }

    private func tabletTab(_ tab: AppTab, title: String, icon: String) -> some View {
        let selected = selection == tab
        return Button { withAnimation(.easeOut(duration: 0.15)) { selection = tab } } label: {
            HStack(spacing: 12) {
                Image(systemName: icon).font(.mv(size: 16, weight: .semibold)).frame(width: 24)
                Text(title).font(.mv(size: 16, weight: selected ? .semibold : .medium))
                Spacer(minLength: 8)
            }
            .foregroundStyle(selected ? MinervaColor.emeraldDark : MinervaColor.ink)
            .padding(.horizontal, 14).frame(minHeight: 48)
            .background(selected ? MinervaColor.emerald.opacity(0.14) : Color.clear, in: RoundedRectangle(cornerRadius: 14))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    @ViewBuilder
    private var selectedContent: some View {
        switch selection {
        case .home: HomeView()
        case .order: MenuView()
        case .orders: NavigationStack { OrderHistoryView() }
        case .scan: ScannerTabView()
        case .rewards: RewardsView()
        case .cards: MembershipCardsView()
        case .profile: ProfileView()
        }
    }

    private func applyPendingTabIfNeeded() {
        guard let pending = router.pendingTab else { return }
        // On phones "Mes cartes" lives inside Compte (five tabs fit the bar;
        // a sixth made iOS hide two of them behind a plain "Autre" list).
        if pending == .scan {
            showScanner = true
        } else if pending == .cards && horizontalSizeClass != .regular {
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

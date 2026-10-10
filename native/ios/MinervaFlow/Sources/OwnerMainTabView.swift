import SwiftUI
import AudioToolbox
import StoreKit

/// Owner shell. Tabs: Aperçu, Commandes, Gestion (menu, inventaire, rapports,
/// équipe, finances), Fidélité, Compte. Same floating tab bar as the client.
struct OwnerMainTabView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @EnvironmentObject private var router: DeepLinkRouter
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @StateObject private var insights = OwnerInsightsStore()
    @Environment(\.requestReview) private var requestReview
    @Environment(\.scenePhase) private var scenePhase
    private let usageTick = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
    @State private var selection = 0
    @State private var managePath: [OwnerManagementRoute] = []
    @State private var showWebSetup = false
    /// Ids of new orders already seen; nil until the first load so existing
    /// orders never ring on launch.
    @State private var knownNewOrderIDs: Set<String>?

    private var L: Lx { Lx(storedLanguage) }
    private var pendingOrderCount: Int { supabase.ownerOrders.filter { $0.status == "soumise" }.count }
    private var newOrderIDs: Set<String> { Set(supabase.ownerOrders.filter { $0.status == "soumise" }.map(\.id)) }

    private var tabs: [(tag: Int, title: String, icon: String)] {
        [(0, L("Aperçu", "Overview"), "rectangle.grid.2x2.fill"),
         (1, L("Commandes", "Orders"), "list.clipboard.fill"),
         (2, L("Gestion", "Manage"), "slider.horizontal.3"),
         (3, L("Fidélité", "Loyalty"), "heart.text.square.fill"),
         (4, L("Compte", "Account"), "person.crop.circle.fill")]
    }

    var body: some View {
        tabContainer
        .tint(MinervaColor.emeraldDark)
        .environmentObject(insights)
        .onReceive(usageTick) { _ in countUsageMinute() }
        .task {
            await supabase.refreshOwnerOperations()
            knownNewOrderIDs = newOrderIDs
        }
        .onChange(of: newOrderIDs) { _, current in
            guard let known = knownNewOrderIDs else { return }
            if !current.subtracting(known).isEmpty { OwnerOrderAlert.ring() }
            knownNewOrderIDs = current
        }
        .task(id: supabase.selectedOwnerRestaurantId) { await insights.load(supabase) }
        .onAppear {
            applyPendingNotificationSection()
            presentWebSetupIfFirstLaunch()
        }
        .onChange(of: router.pendingOwnerSection) { _, _ in applyPendingNotificationSection() }
        .onChange(of: router.pendingOwnerRoute) { _, _ in applyPendingNotificationSection() }
        .onChange(of: supabase.selectedOwnerRestaurantId) { _, _ in Task { await supabase.refreshOwnerOperations() } }
        .fullScreenCover(isPresented: $showWebSetup) { OwnerWebSetupNotice { showWebSetup = false } }
    }

    /// Bottom tab bar on iPhone (system) and iPad (floating, since iPadOS pins
    /// the system bar to the top): one navigation structure across devices.
    @ViewBuilder private var tabContainer: some View {
        if #available(iOS 18.0, *) {
            tabView.tabViewStyle(.tabBarOnly)
                .bottomTabBar(barItems, selection: $selection)
        } else {
            tabView.bottomTabBar(barItems, selection: $selection)
        }
    }

    private var barItems: [BottomTabItem<Int>] {
        tabs.map { BottomTabItem(tag: $0.tag, title: $0.title, icon: $0.icon, badge: $0.tag == 1 ? pendingOrderCount : 0) }
    }

    private var tabView: some View {
        TabView(selection: $selection) {
            ForEach(tabs, id: \.tag) { tab in
                content(for: tab.tag)
                    .hidesSystemTabBarOnRegular()
                    .tabItem { Label(tab.title, systemImage: tab.icon) }
                    .badge(tab.tag == 1 ? pendingOrderCount : 0)
                    .tag(tab.tag)
            }
        }
    }

    @ViewBuilder private func content(for tag: Int) -> some View {
        switch tag {
        case 0: OwnerOverviewScreen(onSelectTab: { selection = $0 }, onOpenRoute: { route in managePath = [route]; selection = 2 })
        case 1: OwnerOrdersScreen()
        case 2: OwnerManageHub(path: $managePath)
        case 3: OwnerLoyaltyScreen()
        default: OwnerAccountScreen()
        }
    }

    /// Shown once per account on this device: marked as seen the moment it
    /// appears, so the second launch (even after a force quit) never shows it.
    private func presentWebSetupIfFirstLaunch() {
        guard let id = supabase.authUserID?.uuidString else { return }
        let key = "ownerWebSetupNoticeSeen.\(id)"
        guard !UserDefaults.standard.bool(forKey: key) else { return }
        UserDefaults.standard.set(true, forKey: key)
        Analytics.capture("owner_web_setup_notice_shown")
        showWebSetup = true
    }

    /// Asks for an App Store rating after 30 minutes of real use, once per app
    /// version (Apple also rate-limits the prompt itself). Counted per account,
    /// only while the app is in the foreground.
    private func countUsageMinute() {
        guard scenePhase == .active, let id = supabase.authUserID?.uuidString else { return }
        let defaults = UserDefaults.standard
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
        let askedKey = "ownerReviewAsked.\(id).\(version)"
        guard !defaults.bool(forKey: askedKey) else { return }
        let minutesKey = "ownerUsageMinutes.\(id)"
        let minutes = defaults.integer(forKey: minutesKey) + 1
        defaults.set(minutes, forKey: minutesKey)
        if minutes >= 30 {
            defaults.set(true, forKey: askedKey)
            Analytics.capture("owner_review_requested")
            requestReview()
        }
    }

    private func applyPendingNotificationSection() {
        if let section = router.pendingOwnerSection {
            selection = min(max(section, 0), 4)
            router.pendingOwnerSection = nil
        }
        if let route = router.pendingOwnerRoute {
            selection = 2
            managePath = [route]
            router.pendingOwnerRoute = nil
        }
    }
}

extension Double {
    var cad: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "CAD"
        formatter.locale = Locale(identifier: "fr_CA")
        return formatter.string(from: NSNumber(value: self)) ?? "—"
    }
}

/// Sound and haptics when a new order arrives while the app is open. In the
/// background the same event reaches the phone as a push notification.
enum OwnerOrderAlert {
    @MainActor static func ring() {
        AudioServicesPlayAlertSound(SystemSoundID(1007))
        let feedback = UINotificationFeedbackGenerator()
        feedback.notificationOccurred(.warning)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { feedback.notificationOccurred(.success) }
        Analytics.capture("owner_new_order_alert")
    }
}

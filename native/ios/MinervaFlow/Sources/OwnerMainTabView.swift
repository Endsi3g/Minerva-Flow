import SwiftUI

/// Owner shell. Tabs: Aperçu, Commandes, Gestion (menu, inventaire, rapports,
/// équipe, finances), Fidélité, Compte. Same floating tab bar as the client.
struct OwnerMainTabView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @EnvironmentObject private var router: DeepLinkRouter
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var selection = 0
    @State private var managePath: [OwnerManagementRoute] = []
    @State private var showWebSetup = false

    private var L: Lx { Lx(storedLanguage) }
    private var isWideWorkspace: Bool { horizontalSizeClass == .regular }
    private var pendingOrderCount: Int { supabase.ownerOrders.filter { $0.status == "soumise" }.count }

    private var tabs: [(tag: Int, title: String, icon: String)] {
        [(0, L("Aperçu", "Overview"), "rectangle.grid.2x2.fill"),
         (1, L("Commandes", "Orders"), "list.clipboard.fill"),
         (2, L("Gestion", "Manage"), "slider.horizontal.3"),
         (3, L("Fidélité", "Loyalty"), "heart.text.square.fill"),
         (4, L("Compte", "Account"), "person.crop.circle.fill")]
    }

    var body: some View {
        Group {
            if isWideWorkspace {
                NavigationSplitView {
                    List {
                        Section(L("Espace propriétaire", "Owner workspace")) {
                            ForEach(tabs, id: \.tag) { tab in sidebarRow(tab) }
                        }
                    }
                    .listStyle(.sidebar)
                    .scrollContentBackground(.hidden)
                    .background(MinervaColor.cream.ignoresSafeArea())
                    .navigationTitle(supabase.ownerBranding?.brandName ?? "Minerva Flow")
                    .safeAreaInset(edge: .bottom) { selectedLocationFooter }
                    .navigationSplitViewColumnWidth(min: 230, ideal: 270, max: 330)
                } detail: {
                    content(for: selection)
                        .frame(maxWidth: 1320).frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(MinervaColor.cream.ignoresSafeArea())
                }
                .navigationSplitViewStyle(.balanced)
            } else {
                TabView(selection: $selection) {
                    ForEach(tabs, id: \.tag) { tab in
                        content(for: tab.tag)
                            .tabItem { Label(tab.title, systemImage: tab.icon) }
                            .badge(tab.tag == 1 ? pendingOrderCount : 0)
                            .tag(tab.tag)
                    }
                }
            }
        }
        .tint(MinervaColor.emeraldDark)
        .task { await supabase.refreshOwnerOperations() }
        .onAppear {
            applyPendingNotificationSection()
            presentWebSetupIfFirstLaunch()
        }
        .onChange(of: router.pendingOwnerSection) { _, _ in applyPendingNotificationSection() }
        .onChange(of: router.pendingOwnerRoute) { _, _ in applyPendingNotificationSection() }
        .onChange(of: supabase.selectedOwnerRestaurantId) { _, _ in Task { await supabase.refreshOwnerOperations() } }
        .fullScreenCover(isPresented: $showWebSetup) { OwnerWebSetupNotice { showWebSetup = false } }
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

    private var selectedLocationFooter: some View {
        VStack(alignment: .leading, spacing: 8) {
            Divider()
            HStack(spacing: 8) {
                Image(systemName: "storefront.fill").foregroundStyle(MinervaColor.emeraldDark)
                VStack(alignment: .leading, spacing: 2) {
                    Text(L("Espace actif", "Active workspace")).font(.caption2.weight(.medium)).foregroundStyle(MinervaColor.inkFaint)
                    Text(supabase.selectedOwnerRestaurant?.name ?? L("Aucun restaurant", "No restaurant"))
                        .font(.mv(size: 12, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                }
                NativeRealtimeStatusPill(isFrench: L.fr)
                Spacer(minLength: 4)
                OwnerLocationMenu()
            }
            .padding(.horizontal, 12).padding(.bottom, 10)
        }
        .background(.regularMaterial)
    }

    private func sidebarRow(_ tab: (tag: Int, title: String, icon: String)) -> some View {
        Button { withAnimation(.snappy(duration: 0.2)) { selection = tab.tag } } label: {
            HStack(spacing: 9) {
                Label(tab.title, systemImage: tab.icon).frame(maxWidth: .infinity, alignment: .leading)
                if tab.tag == 1 && pendingOrderCount > 0 {
                    Text("\(pendingOrderCount)").font(.caption2.weight(.bold).monospacedDigit()).foregroundStyle(.white)
                        .padding(.horizontal, 7).padding(.vertical, 3).background(MinervaColor.emeraldDark, in: Capsule())
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .keyboardShortcut(KeyEquivalent(Character("\(tab.tag + 1)")), modifiers: [.command])
        .listRowBackground(selection == tab.tag ? MinervaColor.emerald.opacity(0.14) : Color.clear)
        .accessibilityAddTraits(selection == tab.tag ? .isSelected : [])
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

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
                // Hand-built sidebar: NavigationSplitView re-ran its update pass
                // endlessly with these nested stacks on iPad (CPU pinned).
                HStack(spacing: 0) {
                    sidebar
                        .frame(width: 280)
                    Rectangle().fill(MinervaColor.border).frame(width: 1)
                    content(for: selection)
                        .id(selection)
                        .frame(maxWidth: 1100)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(MinervaColor.cream.ignoresSafeArea())
                }
                .background(MinervaColor.cream.ignoresSafeArea())
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

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                Image("LogoMark").resizable().frame(width: 32, height: 32).accessibilityHidden(true)
                Text(supabase.ownerBranding?.brandName ?? "Minerva Flow").font(.mv(size: 18, weight: .semibold)).lineLimit(1)
            }
            .padding(.horizontal, 20).padding(.top, 28).padding(.bottom, 20)
            VStack(spacing: 4) {
                ForEach(tabs, id: \.tag) { tab in sidebarRow(tab) }
            }
            .padding(.horizontal, 12)
            Spacer(minLength: 12)
            selectedLocationFooter
        }
        .frame(maxHeight: .infinity)
        .background(MinervaColor.creamSoft.ignoresSafeArea())
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
                Spacer(minLength: 4)
                NativeRealtimeStatusPill(isFrench: L.fr)
            }
            .padding(.horizontal, 12).padding(.bottom, 10)
        }
        .background(.regularMaterial)
    }

    private func sidebarRow(_ tab: (tag: Int, title: String, icon: String)) -> some View {
        let selected = selection == tab.tag
        return Button { withAnimation(.easeOut(duration: 0.15)) { selection = tab.tag } } label: {
            HStack(spacing: 12) {
                Image(systemName: tab.icon).font(.mv(size: 16, weight: .semibold)).frame(width: 24)
                Text(tab.title).font(.mv(size: 16, weight: selected ? .semibold : .medium))
                Spacer(minLength: 8)
                if tab.tag == 1 && pendingOrderCount > 0 {
                    Text("\(pendingOrderCount)").font(.caption2.weight(.bold).monospacedDigit()).foregroundStyle(.white)
                        .padding(.horizontal, 7).padding(.vertical, 3).background(MinervaColor.emeraldDark, in: Capsule())
                }
            }
            .foregroundStyle(selected ? MinervaColor.emeraldDark : MinervaColor.ink)
            .padding(.horizontal, 14).frame(minHeight: 48)
            .background(selected ? MinervaColor.emerald.opacity(0.14) : Color.clear, in: RoundedRectangle(cornerRadius: 14))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .keyboardShortcut(KeyEquivalent(Character("\(tab.tag + 1)")), modifiers: [.command])
        .accessibilityAddTraits(selected ? .isSelected : [])
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

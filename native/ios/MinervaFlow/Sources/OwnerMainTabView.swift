import SwiftUI

struct OwnerMainTabView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @EnvironmentObject private var router: DeepLinkRouter
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var selection = 0

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }
    private var isWideWorkspace: Bool { horizontalSizeClass == .regular }

    var body: some View {
        Group {
            if isWideWorkspace {
                NavigationSplitView {
                    List {
                        Section(isFrench ? "Espace propriétaire" : "Owner workspace") {
                            ownerSection(0, title: isFrench ? "Aperçu" : "Overview", icon: "rectangle.grid.2x2.fill", shortcut: "1")
                            ownerSection(1, title: isFrench ? "Commandes" : "Orders", icon: "list.clipboard.fill", shortcut: "2", badge: pendingOrderCount)
                            ownerSection(2, title: isFrench ? "Menu" : "Menu", icon: "fork.knife", shortcut: "3")
                            ownerSection(3, title: isFrench ? "Fidélisation" : "Loyalty", icon: "heart.text.square.fill", shortcut: "4")
                        }

                        Section(isFrench ? "Gestion" : "Manage") {
                            ownerSection(4, title: isFrench ? "Outils et réglages" : "Tools and settings", icon: "slider.horizontal.3", shortcut: "5")
                        }
                    }
                    .listStyle(.sidebar)
                    .navigationTitle(supabase.ownerBranding?.brandName ?? "Minerva Flow")
                    .safeAreaInset(edge: .bottom) {
                        selectedLocationFooter
                    }
                    .navigationSplitViewColumnWidth(min: 230, ideal: 270, max: 330)
                } detail: {
                    ownerSelectedContent
                        .frame(maxWidth: 1320)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(MinervaColor.cream.ignoresSafeArea())
                }
                .navigationSplitViewStyle(.balanced)
            } else {
                TabView(selection: $selection) {
                    OwnerOverviewView(onSelect: { selection = $0 })
                        .tabItem { Label(isFrench ? "Aperçu" : "Overview", systemImage: "rectangle.grid.2x2.fill") }
                        .tag(0)
                    OwnerOrdersView()
                        .tabItem { Label(isFrench ? "Commandes" : "Orders", systemImage: "list.clipboard.fill") }
                        .tag(1)
                    OwnerMenuView()
                        .tabItem { Label(isFrench ? "Menu" : "Menu", systemImage: "fork.knife") }
                        .tag(2)
                    OwnerLoyaltyView()
                        .tabItem { Label(isFrench ? "Fidélité" : "Loyalty", systemImage: "heart.text.square.fill") }
                        .tag(3)
                    OwnerManagementView()
                        .tabItem { Label(isFrench ? "Gestion" : "Manage", systemImage: "slider.horizontal.3") }
                        .tag(4)
                }
            }
        }
        .tint(MinervaColor.emeraldDark)
        .task { await supabase.refreshOwnerOperations() }
        .onAppear { applyPendingNotificationSection() }
        .onChange(of: router.pendingOwnerSection) { _, _ in applyPendingNotificationSection() }
        .onChange(of: supabase.selectedOwnerRestaurantId) { _, _ in
            Task { await supabase.refreshOwnerOperations() }
        }
    }

    private func applyPendingNotificationSection() {
        guard let section = router.pendingOwnerSection else { return }
        selection = min(max(section, 0), 4)
        router.pendingOwnerSection = nil
    }

    private var pendingOrderCount: Int {
        supabase.ownerOrders.filter { ["soumise", "en_preparation"].contains($0.status) }.count
    }

    private var selectedLocationFooter: some View {
        VStack(alignment: .leading, spacing: 8) {
            Divider()
            HStack(spacing: 8) {
                Image(systemName: "storefront.fill")
                    .foregroundStyle(MinervaColor.emeraldDark)
                VStack(alignment: .leading, spacing: 2) {
                    Text(isFrench ? "Espace actif" : "Active workspace")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(MinervaColor.inkFaint)
                    Text(supabase.selectedOwnerRestaurant?.name ?? (isFrench ? "Aucun restaurant" : "No restaurant"))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .lineLimit(1)
                }
                NativeRealtimeStatusPill(isFrench: isFrench)
                Spacer(minLength: 4)
                OwnerRestaurantPicker()
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 10)
        }
        .background(.regularMaterial)
    }

    private func ownerSection(_ tab: Int, title: String, icon: String, shortcut: KeyEquivalent, badge: Int = 0) -> some View {
        Button {
            withAnimation(.snappy(duration: 0.2)) { selection = tab }
        } label: {
            HStack(spacing: 9) {
                Label(title, systemImage: icon)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if badge > 0 {
                    Text("\(badge)")
                        .font(.caption2.weight(.bold).monospacedDigit())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(MinervaColor.emeraldDark, in: Capsule())
                        .accessibilityLabel(isFrench ? "\(badge) commandes actives" : "\(badge) active orders")
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .keyboardShortcut(shortcut, modifiers: [.command])
        .listRowBackground(selection == tab ? MinervaColor.emerald.opacity(0.14) : Color.clear)
        .accessibilityAddTraits(selection == tab ? .isSelected : [])
    }

    @ViewBuilder private var ownerSelectedContent: some View {
        switch selection {
        case 0: OwnerOverviewView(onSelect: { selection = $0 })
        case 1: OwnerOrdersView()
        case 2: OwnerMenuView()
        case 3: OwnerLoyaltyView()
        default: OwnerManagementView()
        }
    }
}

private struct OwnerOrdersView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var filter = "All"
    @State private var message: String?

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }
    private var filters: [String] { ["All", "soumise", "en_preparation", "prete", "servie"] }
    private var visibleOrders: [NativeOwnerOrder] { filter == "All" ? supabase.ownerOrders : supabase.ownerOrders.filter { $0.status == filter } }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 14) {
                Text(isFrench ? "Commandes" : "Orders")
                    .font(MinervaFont.display(30, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(filters, id: \.self) { value in
                            Button(value == "All" ? (isFrench ? "Toutes" : "All") : statusLabel(value)) { filter = value }
                                .buttonStyle(.bordered)
                                .tint(filter == value ? MinervaColor.emeraldDark : MinervaColor.inkFaint)
                        }
                    }
                }
                if visibleOrders.isEmpty {
                    ContentUnavailableView(isFrench ? "Aucune commande" : "No orders", systemImage: "tray", description: Text(isFrench ? "Les nouvelles commandes de cet espace apparaîtront ici." : "New orders from this workspace will appear here."))
                } else {
                    List(visibleOrders) { order in
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(order.guestName).font(.headline)
                                Text(statusLabel(order.status)).font(.caption).foregroundStyle(MinervaColor.inkFaint)
                                if let readyAt = order.requestedReadyAt, let date = ISO8601DateFormatter().date(from: readyAt) {
                                    Label(isFrench ? "Ramassage · \(date.formatted(date: .abbreviated, time: .shortened))" : "Pickup · \(date.formatted(date: .abbreviated, time: .shortened))", systemImage: "calendar.badge.clock")
                                        .font(.caption2.weight(.semibold)).foregroundStyle(MinervaColor.emeraldDark)
                                }
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 7) {
                                Text(order.total.cad).font(.subheadline.weight(.semibold)).foregroundStyle(MinervaColor.emeraldDark)
                                Menu(isFrench ? "Mettre à jour" : "Update") {
                                    ForEach(filters.dropFirst(), id: \.self) { status in
                                        Button(statusLabel(status)) { updateStatus(order, to: status) }
                                    }
                                    Button(isFrench ? "Avertir le client" : "Notify customer") { notify(order) }
                                }
                                .font(.caption.weight(.semibold))
                            }
                        }
                        .listRowBackground(MinervaColor.surface)
                        .contextMenu {
                            ForEach(filters.dropFirst(), id: \.self) { status in
                                Button(statusLabel(status), systemImage: "arrow.trianglehead.2.clockwise") { updateStatus(order, to: status) }
                            }
                            Button(isFrench ? "Avertir le client" : "Notify customer", systemImage: "bell") { notify(order) }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .padding(20)
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle(isFrench ? "File de commandes" : "Order queue")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
            .refreshable { await supabase.refreshOwnerOperations() }
            .alert(isFrench ? "Commandes" : "Orders", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) { Button("OK", role: .cancel) {} } message: { Text(message ?? "") }
        }
    }

    private func updateStatus(_ order: NativeOwnerOrder, to status: String) {
        Task {
            let ok = await supabase.updateOwnerOrderStatus(order.id, restaurantId: order.restaurantId, status: status)
            message = ok
                ? (isFrench ? "Le statut a été mis à jour et le client a été averti." : "The status was updated and the customer was notified.")
                : (isFrench ? "La commande n’a pas pu être mise à jour." : "The order could not be updated.")
        }
    }

    private func notify(_ order: NativeOwnerOrder) {
        Task {
            let ok = await supabase.notifyOwnerOrder(order.id, restaurantId: order.restaurantId)
            message = ok
                ? (isFrench ? "Le client a été averti par les canaux disponibles." : "The customer was notified through the available channels.")
                : (isFrench ? "Aucun canal de notification n’est disponible pour cette commande." : "No notification channel is available for this order.")
        }
    }

    private func statusLabel(_ value: String) -> String {
        let french = ["soumise": "Nouvelle", "en_preparation": "En préparation", "prete": "Prête", "servie": "Servie"]
        let english = ["soumise": "New", "en_preparation": "Preparing", "prete": "Ready", "servie": "Served"]
        return (isFrench ? french[value] : english[value]) ?? value.capitalized
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

private struct OwnerOverviewView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let onSelect: (Int) -> Void

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }
    private var brandName: String { supabase.ownerBranding?.brandName ?? "Minerva Flow" }
    private var lowStockCount: Int {
        supabase.ownerInventoryItems.filter { item in
            guard let target = item.parLevel, target > 0 else { return false }
            return item.quantityOnHand <= target * 0.3
        }.count
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    HStack(spacing: 12) {
                        if let logo = supabase.ownerBranding?.logoUrl, let url = URL(string: logo) {
                            AsyncImage(url: url) { image in image.resizable().scaledToFit() } placeholder: { Image(systemName: "building.2.fill") }
                                .frame(width: 48, height: 48).clipShape(RoundedRectangle(cornerRadius: 13))
                        } else {
                            Image(systemName: "building.2.fill").font(.title2).foregroundStyle(MinervaColor.emeraldDark)
                                .frame(width: 48, height: 48).background(MinervaColor.emerald.opacity(0.12)).clipShape(RoundedRectangle(cornerRadius: 13))
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            Text(isFrench ? "Espace propriétaire" : "Owner workspace").font(.caption.weight(.semibold)).foregroundStyle(MinervaColor.inkFaint)
                            Text(brandName).font(MinervaFont.display(27, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                        }
                        Spacer()
                        OwnerRestaurantPicker()
                    }

                    HStack(spacing: 12) {
                        OwnerMetric(title: isFrench ? "Ventes ce mois" : "Sales this month", value: supabase.ownerMetrics.monthRevenue.cad, icon: "chart.line.uptrend.xyaxis")
                        OwnerMetric(title: isFrench ? "Commandes ce mois" : "Orders this month", value: "\(supabase.ownerMetrics.monthOrders)", icon: "list.clipboard")
                        OwnerMetric(title: isFrench ? "Emplacements" : "Locations", value: "\(supabase.ownerRestaurants.count)", icon: "building.2")
                    }
                    .frame(maxWidth: .infinity)

                    VStack(alignment: .leading, spacing: 12) {
                        Text(isFrench ? "Accès rapide" : "Quick actions")
                            .font(MinervaFont.display(22, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 215), spacing: 12)], alignment: .leading, spacing: 12) {
                            QuickActionCard(title: isFrench ? "Traiter les commandes" : "Work the order queue", detail: isFrench ? "\(supabase.ownerOrders.count) commandes · ouvrir la file" : "\(supabase.ownerOrders.count) orders · open the queue", icon: "list.clipboard.fill", tint: MinervaColor.emeraldDark) { onSelect(1) }
                            QuickActionCard(title: isFrench ? "Mettre le menu à jour" : "Update the menu", detail: isFrench ? "\(supabase.ownerMenuItems.count) articles dans ce lieu" : "\(supabase.ownerMenuItems.count) items at this location", icon: "fork.knife", tint: MinervaColor.emeraldDark) { onSelect(2) }
                            QuickActionCard(title: isFrench ? "Vérifier les stocks" : "Check inventory", detail: lowStockCount > 0 ? (isFrench ? "\(lowStockCount) sous 30 % du seuil" : "\(lowStockCount) below the 30% threshold") : (isFrench ? "Stocks et seuils de réapprovisionnement" : "Stock levels and replenishment targets"), icon: lowStockCount > 0 ? "exclamationmark.triangle.fill" : "shippingbox.fill", tint: lowStockCount > 0 ? .orange : MinervaColor.emeraldDark) { onSelect(4) }
                            QuickActionCard(title: isFrench ? "Voir les résultats" : "Review performance", detail: isFrench ? "Ventes, équipe et activité" : "Sales, team, and activity", icon: "chart.bar.fill", tint: MinervaColor.emeraldDark) { onSelect(4) }
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text(isFrench ? "Vos emplacements" : "Your locations").font(MinervaFont.display(22, weight: .semibold))
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 250), spacing: 12)], alignment: .leading, spacing: 12) {
                            ForEach(supabase.ownerRestaurants) { restaurant in
                                HStack(spacing: 13) {
                                    Image(systemName: "storefront.fill").foregroundStyle(MinervaColor.emeraldDark).frame(width: 38, height: 38).background(MinervaColor.emerald.opacity(0.1)).clipShape(Circle())
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(restaurant.name).font(.headline).foregroundStyle(MinervaColor.ink)
                                        Text(restaurant.city ?? (isFrench ? "Lieu" : "Location")).font(.caption).foregroundStyle(MinervaColor.inkFaint)
                                    }
                                    Spacer(minLength: 6)
                                    if restaurant.id == supabase.selectedOwnerRestaurantId {
                                        Image(systemName: "checkmark.circle.fill").foregroundStyle(MinervaColor.emeraldDark).accessibilityLabel(isFrench ? "Emplacement sélectionné" : "Selected location")
                                    } else {
                                        Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(MinervaColor.inkFaint)
                                    }
                                }
                                .padding(15).frame(maxWidth: .infinity, alignment: .leading)
                                .background(MinervaColor.surface).clipShape(RoundedRectangle(cornerRadius: 16)).shadow(color: .black.opacity(0.04), radius: 8, y: 3)
                            }
                        }
                    }
                    Text("Minerva Flow").font(.caption2).foregroundStyle(MinervaColor.inkFaint).frame(maxWidth: .infinity, alignment: .center).padding(.top, 6)
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle(isFrench ? "Aperçu" : "Overview")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
            .refreshable { await supabase.refreshOwnerOperations() }
        }
    }
}

private struct QuickActionCard: View {
    let title: String
    let detail: String
    let icon: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 36, height: 36)
                    .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 5) {
                    Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(MinervaColor.ink)
                    Text(detail).font(.caption).foregroundStyle(MinervaColor.inkFaint).multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right").font(.caption.weight(.semibold)).foregroundStyle(MinervaColor.inkFaint)
            }
            .padding(15)
            .frame(maxWidth: .infinity, minHeight: 82, alignment: .leading)
            .background(MinervaColor.surface, in: RoundedRectangle(cornerRadius: 15))
            .overlay(RoundedRectangle(cornerRadius: 15).stroke(MinervaColor.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityHint(detail)
    }
}

struct OwnerMetric: View {
    let title: String; let value: String; let icon: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon).foregroundStyle(MinervaColor.emeraldDark)
            Text(value).font(.title3.bold()).foregroundStyle(MinervaColor.ink).lineLimit(1).minimumScaleFactor(0.8)
            Text(title).font(.caption).foregroundStyle(MinervaColor.inkFaint).lineLimit(2)
        }
        .frame(maxWidth: .infinity, minHeight: 100, alignment: .leading)
        .padding(14).background(MinervaColor.surface).clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

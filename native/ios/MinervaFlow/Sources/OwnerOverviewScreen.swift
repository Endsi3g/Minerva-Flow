import SwiftUI

/// Owner home: one hero number, what needs attention now, and the three
/// actions an owner takes most. Location switching lives in the toolbar only.
struct OwnerOverviewScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let onSelectTab: (Int) -> Void
    let onOpenRoute: (OwnerManagementRoute) -> Void
    @State private var showAddItem = false
    @State private var showAddInventory = false

    private var L: Lx { Lx(storedLanguage) }
    private var newOrders: [NativeOwnerOrder] { supabase.ownerOrders.filter { $0.status == "soumise" } }
    private var activeOrders: [NativeOwnerOrder] { supabase.ownerOrders.filter { ["confirmee", "en_preparation", "prete"].contains($0.status) } }
    private var todayOrders: Int { supabase.ownerOrders.filter { $0.status != "annulee" && Calendar.current.isDateInToday($0.createdAt.ownerDate ?? .distantPast) }.count }
    private var lowStock: [NativeOwnerInventoryItem] {
        supabase.ownerInventoryItems.filter { item in
            guard let target = item.parLevel, target > 0 else { return false }
            return item.quantityOnHand <= target * 0.3
        }
    }
    private var unansweredReviews: Int { supabase.ownerReviews.filter { ($0.ownerResponse ?? "").isEmpty }.count }
    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        return hour < 12 ? L("Bonjour", "Good morning") : (hour < 18 ? L("Bon après-midi", "Good afternoon") : L("Bonsoir", "Good evening"))
    }

    var body: some View {
        NavigationStack {
            OwnerScreen(title: greeting, subtitle: supabase.selectedOwnerRestaurant?.name ?? supabase.ownerBranding?.brandName) {
                hero
                attention
                quickActions
                stats
                moreLinks
            }
            .sheet(isPresented: $showAddItem) { OwnerAddMenuItemSheet() }
            .sheet(isPresented: $showAddInventory) { OwnerAddInventorySheet() }
        }
    }

    private var hero: some View {
        OwnerHeroCard(eyebrow: L("Ventes ce mois-ci", "Sales this month"),
                      value: supabase.ownerMetrics.monthRevenue.cad,
                      caption: L("\(supabase.ownerMetrics.monthOrders) \(supabase.ownerMetrics.monthOrders > 1 ? "commandes" : "commande") · \(todayOrders) aujourd'hui", "\(supabase.ownerMetrics.monthOrders) \(supabase.ownerMetrics.monthOrders == 1 ? "order" : "orders") · \(todayOrders) today")) {
            if supabase.isLoadingOwnerOperations {
                HStack(spacing: 8) {
                    ProgressView().tint(.white)
                    Text(L("Actualisation…", "Refreshing…")).font(.mv(size: 12.5)).foregroundStyle(.white.opacity(0.8))
                }
            }
        }
    }

    @ViewBuilder private var attention: some View {
        let hasAttention = !newOrders.isEmpty || !lowStock.isEmpty || unansweredReviews > 0 || !activeOrders.isEmpty
        VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: L("À faire maintenant", "To do now"))
            OwnerCard(padding: 6) {
                if !hasAttention {
                    OwnerRow(icon: "checkmark.seal.fill", title: L("Tout est à jour", "You're all caught up"),
                             subtitle: L("Aucune commande ni alerte en attente.", "No pending orders or alerts."), chevron: false)
                        .padding(.horizontal, 10)
                } else {
                    VStack(spacing: 0) {
                        if !newOrders.isEmpty {
                            attentionRow(icon: "bell.badge.fill", tone: .warn,
                                         title: L("\(newOrders.count) nouvelle(s) commande(s)", "\(newOrders.count) new order(s)"),
                                         subtitle: L("À accepter ou refuser", "Accept or decline")) { onSelectTab(1) }
                        }
                        if !activeOrders.isEmpty {
                            if !newOrders.isEmpty { OwnerDivider() }
                            attentionRow(icon: "flame.fill", tone: .info,
                                         title: L("\(activeOrders.count) en cours", "\(activeOrders.count) in progress"),
                                         subtitle: L("Préparation et remise", "Preparing and handing over")) { onSelectTab(1) }
                        }
                        if !lowStock.isEmpty {
                            if !newOrders.isEmpty || !activeOrders.isEmpty { OwnerDivider() }
                            attentionRow(icon: "exclamationmark.triangle.fill", tone: .bad,
                                         title: L("\(lowStock.count) \(lowStock.count > 1 ? "articles à réapprovisionner" : "article à réapprovisionner")", "\(lowStock.count) \(lowStock.count == 1 ? "item" : "items") to restock"),
                                         subtitle: lowStock.prefix(2).map(\.name).joined(separator: ", ")) { onOpenRoute(.inventory) }
                        }
                        if unansweredReviews > 0 {
                            if !newOrders.isEmpty || !activeOrders.isEmpty || !lowStock.isEmpty { OwnerDivider() }
                            attentionRow(icon: "star.bubble.fill", tone: .neutral,
                                         title: L("\(unansweredReviews) avis sans réponse", "\(unansweredReviews) review(s) without a reply"),
                                         subtitle: L("Répondez pour rassurer vos clients", "Reply to reassure your guests")) { onSelectTab(3) }
                        }
                    }
                }
            }
        }
    }

    private func attentionRow(icon: String, tone: OwnerTone, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            OwnerRow(icon: icon, title: title, subtitle: subtitle, tint: tone.color, chevron: true)
                .padding(.horizontal, 10).padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: L("Actions rapides", "Quick actions"))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    quickChip(L("Nouvel article", "New item"), "plus.circle.fill") { showAddItem = true }
                    quickChip(L("Ajouter au stock", "Add stock"), "shippingbox.fill") { showAddInventory = true }
                    quickChip(L("Créditer une visite", "Credit a visit"), "heart.text.square.fill") { onSelectTab(3) }
                    quickChip(L("Rapports", "Reports"), "chart.bar.fill") { onOpenRoute(.reports) }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private func quickChip(_ title: String, _ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon).font(.mv(size: 15, weight: .semibold))
                Text(title).font(.mv(size: 14, weight: .semibold))
            }
            .foregroundStyle(MinervaColor.emeraldDark)
            .padding(.horizontal, 16).frame(minHeight: 48)
            .background(MinervaColor.emerald.opacity(0.12), in: Capsule())
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var stats: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            OwnerStatTile(icon: "person.2.fill", value: "\(supabase.ownerCustomers.count)", label: L("Clients fidélité", "Loyalty customers"))
            OwnerStatTile(icon: "fork.knife", value: "\(supabase.ownerMenuItems.filter { $0.active }.count)", label: L("Articles au menu", "Menu items live"))
        }
    }

    private var moreLinks: some View {
        OwnerCard(padding: 6) {
            VStack(spacing: 0) {
                Button { onOpenRoute(.locations) } label: {
                    OwnerRow(icon: "mappin.and.ellipse", title: L("Emplacements", "Locations"),
                             subtitle: L("\(supabase.ownerRestaurants.count) \(supabase.ownerRestaurants.count > 1 ? "établissements" : "établissement")", "\(supabase.ownerRestaurants.count) \(supabase.ownerRestaurants.count == 1 ? "location" : "locations")"), chevron: true)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                }.buttonStyle(.plain)
            }
        }
    }
}

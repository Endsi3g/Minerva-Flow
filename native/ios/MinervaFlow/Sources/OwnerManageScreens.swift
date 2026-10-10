import SwiftUI
import Charts

// MARK: - Gestion hub

struct OwnerManageHub: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @EnvironmentObject private var router: DeepLinkRouter
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @Binding var path: [OwnerManagementRoute]
    @State private var showAmbassadorProgram = false
    private var L: Lx { Lx(storedLanguage) }

    private var lowStockCount: Int {
        supabase.ownerInventoryItems.filter { item in
            guard let target = item.parLevel, target > 0 else { return false }
            return item.quantityOnHand <= target * 0.3
        }.count
    }

    var body: some View {
        NavigationStack(path: $path) {
            OwnerScreen(title: L("Gestion", "Manage"), subtitle: supabase.selectedOwnerRestaurant?.name) {
                group(L("Opérations", "Operations")) {
                    row(.menu, "fork.knife", L("Menu", "Menu"), L("\(supabase.ownerMenuItems.count) \(supabase.ownerMenuItems.count == 1 ? "article" : "articles")", "\(supabase.ownerMenuItems.count) \(supabase.ownerMenuItems.count == 1 ? "item" : "items")"))
                    OwnerDivider()
                    row(.inventory, "shippingbox.fill", L("Inventaire", "Inventory"),
                        lowStockCount > 0 ? L("\(lowStockCount) à réapprovisionner", "\(lowStockCount) to restock") : L("\(supabase.ownerInventoryItems.count) \(supabase.ownerInventoryItems.count == 1 ? "article suivi" : "articles suivis")", "\(supabase.ownerInventoryItems.count) tracked \(supabase.ownerInventoryItems.count == 1 ? "item" : "items")"),
                        tint: lowStockCount > 0 ? OwnerTone.warn.color : MinervaColor.emeraldDark)
                    OwnerDivider()
                    row(.reports, "chart.bar.fill", L("Rapports", "Reports"), L("Ventes, clients et activité", "Sales, customers and activity"))
                    OwnerDivider()
                    row(.finance, "creditcard.fill", L("Finances", "Finance"), L("Revenus et dépenses", "Revenue and expenses"))
                }
                group(L("Équipe et lieux", "Team and locations")) {
                    row(.team, "person.3.fill", L("Équipe", "Team"), L("\(supabase.ownerEmployees.count) \(supabase.ownerEmployees.count == 1 ? "membre" : "membres")", "\(supabase.ownerEmployees.count) \(supabase.ownerEmployees.count == 1 ? "member" : "members")"))
                    OwnerDivider()
                    row(.locations, "mappin.and.ellipse", L("Emplacements", "Locations"), L("\(supabase.ownerRestaurants.count) établissement(s)", "\(supabase.ownerRestaurants.count) location(s)"))
                }
                group(L("Développement", "Growth")) {
                    Button { showAmbassadorProgram = true } label: {
                        OwnerRow(icon: "megaphone.fill", title: L("Programme ambassadeur", "Ambassador program"), subtitle: L("Faites connaître votre café", "Spread the word"), chevron: true)
                            .padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                    if NFCTagReader.isAvailable {
                        OwnerDivider()
                        NavigationLink { OwnerNFCView() } label: {
                            OwnerRow(icon: "wave.3.right", title: L("Tags NFC", "NFC tags"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                        }.buttonStyle(.plain)
                    }
                    OwnerDivider()
                    NavigationLink { OwnerGoogleBusinessProfileView() } label: {
                        OwnerRow(icon: "star.bubble.fill", title: "Google Business Profile", subtitle: L("Avis et fiche Google", "Reviews and Google listing"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                }
            }
            .navigationDestination(for: OwnerManagementRoute.self) { OwnerManagementDestination(route: $0) }
            .sheet(isPresented: $showAmbassadorProgram) { FlowAmbassadorMobileView() }
        }
    }

    private func group<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: title)
            OwnerCard(padding: 6) { VStack(spacing: 0) { content() } }
        }
    }

    private func row(_ route: OwnerManagementRoute, _ icon: String, _ title: String, _ subtitle: String, tint: Color = MinervaColor.emeraldDark) -> some View {
        NavigationLink(value: route) {
            OwnerRow(icon: icon, title: title, subtitle: subtitle, tint: tint, chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
        }.buttonStyle(.plain)
    }
}

// MARK: - Menu

struct OwnerMenuScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var selectedItem: NativeMenuItem?
    @State private var showAdd = false
    @State private var query = ""
    private var L: Lx { Lx(storedLanguage) }

    private var filtered: [NativeMenuItem] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return q.isEmpty ? supabase.ownerMenuItems : supabase.ownerMenuItems.filter { $0.name.lowercased().contains(q) || ($0.category ?? "").lowercased().contains(q) }
    }
    private var grouped: [(category: String, items: [NativeMenuItem])] {
        let none = L("Sans catégorie", "Uncategorized")
        let groups = Dictionary(grouping: filtered) { ($0.category?.isEmpty == false ? $0.category! : none) }
        return groups.keys.sorted().map { ($0, groups[$0] ?? []) }
    }

    var body: some View {
        OwnerScreen(title: L("Menu", "Menu"), subtitle: L("\(supabase.ownerMenuItems.count) \(supabase.ownerMenuItems.count == 1 ? "article" : "articles") · touchez pour modifier", "\(supabase.ownerMenuItems.count) \(supabase.ownerMenuItems.count == 1 ? "item" : "items") · tap to edit")) {
            Button { showAdd = true } label: { Label(L("Ajouter un article", "Add an item"), systemImage: "plus") }
                .buttonStyle(OwnerPrimaryButtonStyle())
            if !supabase.ownerMealSuggestions.isEmpty { suggestions }
            if supabase.ownerMenuItems.isEmpty {
                OwnerCard { OwnerEmptyState(icon: "fork.knife", title: L("Aucun article au menu", "No menu items"),
                                            message: L("Ajoutez votre premier article pour que les clients puissent commander.", "Add your first item so customers can order."),
                                            actionTitle: L("Ajouter un article", "Add an item")) { showAdd = true } }
            } else {
                ForEach(grouped, id: \.category) { group in
                    VStack(alignment: .leading, spacing: 10) {
                        OwnerSectionHeader(title: group.category)
                        OwnerCard(padding: 6) {
                            VStack(spacing: 0) {
                                ForEach(Array(group.items.enumerated()), id: \.element.id) { index, item in
                                    if index > 0 { OwnerDivider() }
                                    menuRow(item)
                                }
                            }
                        }
                    }
                }
            }
        }
        .searchable(text: $query, prompt: L("Rechercher un article", "Search items"))
        .sheet(item: $selectedItem) { MenuItemEditor(item: $0, isFrench: L.fr) }
        .sheet(isPresented: $showAdd) { OwnerAddMenuItemSheet() }
    }

    private func menuRow(_ item: NativeMenuItem) -> some View {
        Button { selectedItem = item } label: {
            HStack(spacing: 12) {
                if let urlString = item.imageUrl, let url = URL(string: urlString) {
                    AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { MinervaColor.border }
                        .frame(width: 44, height: 44).clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    OwnerIconTile(icon: MenuCategoryIcon.symbolName(for: item.category ?? ""), size: 44)
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.name).font(.mv(size: 15, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                    HStack(spacing: 6) {
                        Text(item.priceOptions.flatMap { $0.map(\.price).min() }.map { L("Dès ", "From ") + $0.cad } ?? item.price.cad)
                            .font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft)
                        if item.isDraft == true { OwnerPill(text: L("Brouillon", "Draft"), tone: .warn) }
                        else if !item.active { OwnerPill(text: L("Masqué", "Hidden"), tone: .neutral) }
                    }
                }
                Spacer(minLength: 8)
                if item.isDraft != true {
                    Toggle("", isOn: Binding(get: { item.active }, set: { toggle(item, $0) }))
                        .labelsHidden().tint(MinervaColor.emerald)
                        .accessibilityLabel(Text(L("Disponible aux clients", "Available to customers")))
                }
            }
            .padding(.horizontal, 10).padding(.vertical, 8).frame(minHeight: 60)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func toggle(_ item: NativeMenuItem, _ active: Bool) {
        Task {
            _ = await supabase.updateOwnerMenuItem(item, name: item.name, price: item.price, priceOptions: item.priceOptions ?? [],
                                                   description: item.description, active: active, allergens: item.allergens ?? [],
                                                   allergensConfirmed: item.allergensConfirmed ?? false)
        }
    }

    private var suggestions: some View {
        VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: L("Idées de vos clients", "Customer ideas"))
            OwnerCard(padding: 6) {
                VStack(spacing: 0) {
                    ForEach(Array(supabase.ownerMealSuggestions.enumerated()), id: \.element.id) { index, suggestion in
                        if index > 0 { OwnerDivider() }
                        OwnerRow(icon: "lightbulb.fill", title: suggestion.title, subtitle: L("\(suggestion.voteCount) votes", "\(suggestion.voteCount) votes"), tint: OwnerTone.warn.color) {
                            if suggestion.status == "draft_added" {
                                OwnerPill(text: L("Brouillon", "Draft"), tone: .good, icon: "checkmark")
                            } else if suggestion.status == "open" || suggestion.status == "under_review" {
                                Button(L("Ajouter", "Add")) { Task { _ = await supabase.addMealSuggestionAsDraft(suggestion) } }
                                    .buttonStyle(OwnerPrimaryButtonStyle(compact: true))
                            }
                        }
                        .padding(.horizontal, 10).padding(.vertical, 4)
                    }
                }
            }
        }
    }
}

struct OwnerAddMenuItemSheet: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var name = ""
    @State private var category = ""
    @State private var price = ""
    @State private var description = ""
    @State private var allergens = ""
    @State private var allergensConfirmed = false
    @State private var active = true
    @State private var saving = false
    @State private var error: String?
    private var L: Lx { Lx(storedLanguage) }
    private var existingCategories: [String] {
        Array(Set(supabase.ownerMenuItems.compactMap { $0.category }.filter { !$0.isEmpty })).sorted()
    }
    private var parsedPrice: Double? { Double(price.replacingOccurrences(of: ",", with: ".")).flatMap { $0.isFinite && $0 >= 0 ? $0 : nil } }

    var body: some View {
        OwnerFormSheet(title: L("Nouvel article", "New item"), saveTitle: L("Ajouter", "Add"),
                       canSave: !name.trimmingCharacters(in: .whitespaces).isEmpty && parsedPrice != nil, isSaving: saving, errorMessage: error, onSave: save) {
            Section(L("Article", "Item")) {
                TextField(L("Nom", "Name"), text: $name)
                TextField(L("Prix ($)", "Price ($)"), text: $price).keyboardType(.decimalPad)
                TextField(L("Description", "Description"), text: $description, axis: .vertical).lineLimit(2...5)
            }
            Section(L("Catégorie", "Category")) {
                TextField(L("Ex. Cafés, Desserts", "e.g. Coffee, Desserts"), text: $category)
                if !existingCategories.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack { ForEach(existingCategories, id: \.self) { value in
                            Button(value) { category = value }.buttonStyle(OwnerSecondaryButtonStyle(compact: true))
                        } }
                    }
                }
            }
            Section {
                TextField(L("Allergènes, séparés par des virgules", "Allergens, comma separated"), text: $allergens, axis: .vertical)
                Toggle(L("Allergènes vérifiés", "Allergens verified"), isOn: $allergensConfirmed)
                Toggle(L("Disponible aux clients", "Available to customers"), isOn: $active)
            } header: { Text(L("Sécurité et disponibilité", "Safety and availability")) } footer: {
                Text(L("Sans vérification des allergènes, l'article est enregistré en brouillon et reste masqué.", "Without verified allergens the item is saved as a hidden draft."))
            }
        }
    }

    private func save() {
        guard let amount = parsedPrice else { return }
        saving = true; error = nil
        let list = allergens.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        Task {
            let ok = await supabase.createOwnerMenuItem(name: name, category: category, price: amount, description: description, allergens: list, allergensConfirmed: allergensConfirmed, active: active)
            saving = false
            if ok { dismiss() } else { error = L("L'article n'a pas été ajouté. Vérifiez les champs et réessayez.", "The item was not added. Check the fields and try again.") }
        }
    }
}

// MARK: - Inventory

struct OwnerInventoryScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var selected: NativeOwnerInventoryItem?
    @State private var showAdd = false
    @State private var onlyLow = false
    @State private var query = ""
    private var L: Lx { Lx(storedLanguage) }

    private func isLow(_ item: NativeOwnerInventoryItem) -> Bool {
        guard let target = item.parLevel, target > 0 else { return false }
        return item.quantityOnHand <= target * 0.3
    }
    private var lowCount: Int { supabase.ownerInventoryItems.filter(isLow).count }
    private var stockValue: Double { supabase.ownerInventoryItems.reduce(0) { $0 + $1.quantityOnHand * $1.unitCost } }
    private var visible: [NativeOwnerInventoryItem] {
        let base = onlyLow ? supabase.ownerInventoryItems.filter(isLow) : supabase.ownerInventoryItems
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return q.isEmpty ? base : base.filter { $0.name.lowercased().contains(q) }
    }

    var body: some View {
        OwnerScreen(title: L("Inventaire", "Inventory"), subtitle: supabase.selectedOwnerRestaurant?.name) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                OwnerStatTile(icon: "shippingbox.fill", value: "\(supabase.ownerInventoryItems.count)", label: L("Articles suivis", "Tracked items"))
                OwnerStatTile(icon: lowCount > 0 ? "exclamationmark.triangle.fill" : "checkmark.seal.fill", value: "\(lowCount)",
                              label: L("À réapprovisionner", "To restock"), tone: lowCount > 0 ? .bad : .good)
            }
            Button { showAdd = true } label: { Label(L("Ajouter un article", "Add an item"), systemImage: "plus") }
                .buttonStyle(OwnerPrimaryButtonStyle())
            if !supabase.ownerInventoryItems.isEmpty {
                Picker("", selection: $onlyLow) {
                    Text(L("Tout", "All")).tag(false)
                    Text(L("À réapprovisionner", "To restock")).tag(true)
                }.pickerStyle(.segmented)
                Text(L("Valeur du stock : ", "Stock value: ") + stockValue.cad).font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft)
            }
            if supabase.ownerInventoryItems.isEmpty {
                OwnerCard { OwnerEmptyState(icon: "shippingbox", title: L("Aucun article en stock", "No inventory yet"),
                                            message: L("Ajoutez vos ingrédients et fournitures pour suivre les quantités et recevoir des alertes.", "Add ingredients and supplies to track quantities and get alerts."),
                                            actionTitle: L("Ajouter un article", "Add an item")) { showAdd = true } }
            } else if visible.isEmpty {
                OwnerCard { OwnerEmptyState(icon: "checkmark.circle", title: L("Rien à signaler", "Nothing to flag"), message: L("Aucun article ne correspond.", "No item matches.")) }
            } else {
                OwnerCard(padding: 6) {
                    VStack(spacing: 0) {
                        ForEach(Array(visible.enumerated()), id: \.element.id) { index, item in
                            if index > 0 { OwnerDivider() }
                            Button { selected = item } label: { inventoryRow(item) }.buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .searchable(text: $query, prompt: L("Rechercher", "Search"))
        .sheet(item: $selected) { InventoryEditor(item: $0) }
        .sheet(isPresented: $showAdd) { OwnerAddInventorySheet() }
    }

    private func inventoryRow(_ item: NativeOwnerInventoryItem) -> some View {
        let low = isLow(item)
        let ratio: Double = {
            guard let target = item.parLevel, target > 0 else { return 1 }
            return min(max(item.quantityOnHand / target, 0), 1)
        }()
        return HStack(spacing: 12) {
            OwnerIconTile(icon: low ? "exclamationmark.triangle.fill" : "shippingbox.fill", tint: low ? OwnerTone.bad.color : MinervaColor.emeraldDark)
            VStack(alignment: .leading, spacing: 5) {
                Text(item.name).font(.mv(size: 15, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                ProgressView(value: ratio).tint(low ? OwnerTone.bad.color : (ratio < 1 ? OwnerTone.warn.color : MinervaColor.emerald))
                Text("\(item.quantityOnHand.formatted()) \(item.unit)" + (item.parLevel.map { L(" · seuil ", " · target ") + $0.formatted() } ?? ""))
                    .font(.mv(size: 12)).foregroundStyle(low ? OwnerTone.bad.color : MinervaColor.inkSoft)
            }
            Image(systemName: "chevron.right").font(.mv(size: 12, weight: .semibold)).foregroundStyle(MinervaColor.inkFaint)
        }
        .padding(.horizontal, 10).padding(.vertical, 8).frame(minHeight: 60).contentShape(Rectangle())
    }
}

struct OwnerAddInventorySheet: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var name = ""
    @State private var unit = ""
    @State private var quantity = ""
    @State private var par = ""
    @State private var cost = ""
    @State private var saving = false
    @State private var error: String?
    private var L: Lx { Lx(storedLanguage) }
    private func number(_ text: String) -> Double? { Double(text.replacingOccurrences(of: ",", with: ".")) }

    var body: some View {
        OwnerFormSheet(title: L("Nouvel article en stock", "New stock item"), saveTitle: L("Ajouter", "Add"),
                       canSave: !name.trimmingCharacters(in: .whitespaces).isEmpty && (quantity.isEmpty || number(quantity) != nil), isSaving: saving, errorMessage: error, onSave: save) {
            Section(L("Article", "Item")) {
                TextField(L("Nom (ex. Grains de café)", "Name (e.g. Coffee beans)"), text: $name)
                TextField(L("Unité (kg, L, unité…)", "Unit (kg, L, each…)"), text: $unit)
            }
            Section {
                TextField(L("Quantité en stock", "Quantity on hand"), text: $quantity).keyboardType(.decimalPad)
                TextField(L("Seuil de réapprovisionnement", "Replenishment target"), text: $par).keyboardType(.decimalPad)
                TextField(L("Coût unitaire ($)", "Unit cost ($)"), text: $cost).keyboardType(.decimalPad)
            } footer: {
                Text(L("Une alerte apparaît quand le stock tombe à 30 % du seuil.", "An alert appears when stock drops to 30% of the target."))
            }
        }
    }

    private func save() {
        saving = true; error = nil
        Task {
            let ok = await supabase.createOwnerInventoryItem(name: name, category: nil, unit: unit, quantity: number(quantity) ?? 0, parLevel: par.isEmpty ? nil : number(par), unitCost: number(cost) ?? 0)
            saving = false
            if ok { dismiss() } else { error = L("L'article n'a pas été ajouté. Réessayez.", "The item was not added. Try again.") }
        }
    }
}

// MARK: - Reports

struct OwnerReportsScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    private var L: Lx { Lx(storedLanguage) }

    private var averageTicket: Double {
        supabase.ownerMetrics.monthOrders > 0 ? supabase.ownerMetrics.monthRevenue / Double(supabase.ownerMetrics.monthOrders) : 0
    }
    private var repeatShare: Int {
        guard !supabase.ownerCustomers.isEmpty else { return 0 }
        return Int((Double(supabase.ownerCustomers.filter { $0.visitCount >= 2 }.count) / Double(supabase.ownerCustomers.count) * 100).rounded())
    }
    private struct Point: Identifiable { let id = UUID(); let label: String; let value: Double; let isRevenue: Bool }
    private var flow: [Point] {
        let revenue = supabase.ownerTransactions.filter { $0.direction == "in" }.reduce(0) { $0 + $1.amount }
        let expenses = supabase.ownerTransactions.filter { $0.direction == "out" }.reduce(0) { $0 + $1.amount }
        return [Point(label: L("Revenus", "Revenue"), value: revenue, isRevenue: true), Point(label: L("Dépenses", "Expenses"), value: expenses, isRevenue: false)]
    }

    var body: some View {
        OwnerScreen(title: L("Rapports", "Reports"), subtitle: L("Ce mois-ci · ", "This month · ") + (supabase.selectedOwnerRestaurant?.name ?? "")) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                OwnerStatTile(icon: "chart.line.uptrend.xyaxis", value: supabase.ownerMetrics.monthRevenue.cad, label: L("Ventes", "Sales"))
                OwnerStatTile(icon: "list.clipboard", value: "\(supabase.ownerMetrics.monthOrders)", label: L("Commandes", "Orders"))
                OwnerStatTile(icon: "receipt", value: averageTicket.cad, label: L("Panier moyen", "Average basket"), tone: .info)
                OwnerStatTile(icon: "arrow.triangle.2.circlepath", value: "\(repeatShare) %", label: L("Clients qui reviennent", "Returning customers"), tone: .info)
            }
            VStack(alignment: .leading, spacing: 10) {
                OwnerSectionHeader(title: L("Revenus et dépenses", "Revenue and expenses"))
                OwnerCard {
                    if supabase.ownerTransactions.isEmpty {
                        OwnerEmptyState(icon: "chart.bar", title: L("Pas encore de données", "No data yet"), message: L("Les transactions apparaîtront ici au fil de l'activité.", "Transactions will appear here as activity comes in."))
                    } else {
                        Chart(flow) { point in
                            BarMark(x: .value(L("Catégorie", "Category"), point.label), y: .value(L("Montant", "Amount"), point.value))
                                .foregroundStyle(point.isRevenue ? MinervaColor.emerald : OwnerTone.bad.color)
                                .cornerRadius(8)
                        }
                        .frame(height: 190).chartYAxis { AxisMarks(position: .leading) }
                    }
                }
            }
            VStack(alignment: .leading, spacing: 10) {
                OwnerSectionHeader(title: L("Activité récente", "Recent activity"))
                OwnerCard(padding: 6) {
                    if supabase.ownerTransactions.isEmpty {
                        Text(L("Aucune activité récente.", "No recent activity.")).font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft).padding(14)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(supabase.ownerTransactions.prefix(10).enumerated()), id: \.element.id) { index, tx in
                                if index > 0 { OwnerDivider() }
                                OwnerRow(icon: tx.direction == "in" ? "arrow.down.circle.fill" : "arrow.up.circle.fill", title: tx.description, subtitle: tx.date,
                                         tint: tx.direction == "in" ? MinervaColor.emeraldDark : OwnerTone.bad.color) {
                                    Text((tx.direction == "in" ? "+" : "−") + tx.amount.cad).font(.mv(size: 14, weight: .semibold))
                                        .foregroundStyle(tx.direction == "in" ? MinervaColor.emeraldDark : OwnerTone.bad.color)
                                }.padding(.horizontal, 10).padding(.vertical, 4)
                            }
                        }
                    }
                }
            }
        }
    }
}

import SwiftUI
import Charts

// Owner/manager operations are intentionally native views, backed by the
// caller's RLS-scoped Supabase session. No sample data or service-role key
// is embedded in the app; TestFlight therefore exercises the same isolated
// production records and permissions as the web dashboard.

struct OwnerRestaurantPicker: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }

    var body: some View {
        if supabase.ownerRestaurants.count > 1 {
            Picker(isFrench ? "Emplacement" : "Location", selection: Binding(
                get: { supabase.selectedOwnerRestaurantId ?? "" },
                set: { id in Task { await supabase.selectOwnerRestaurant(id) } }
            )) {
                ForEach(supabase.ownerRestaurants) { restaurant in
                    Text(restaurant.name).tag(restaurant.id)
                }
            }
            .pickerStyle(.menu)
        }
    }
}

struct MenuItemEditor: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let item: NativeMenuItem
    let isFrench: Bool
    @State private var name: String
    @State private var price: String
    @State private var priceOptions: [NativeMenuPriceOption]
    @State private var description: String
    @State private var allergens: String
    @State private var allergensConfirmed: Bool
    @State private var active: Bool
    @State private var saving = false
    @State private var validationMessage: String?

    init(item: NativeMenuItem, isFrench: Bool) {
        self.item = item
        self.isFrench = isFrench
        _name = State(initialValue: item.name)
        _price = State(initialValue: String(format: "%.2f", item.price))
        _priceOptions = State(initialValue: item.priceOptions ?? [])
        _description = State(initialValue: item.description ?? "")
        _allergens = State(initialValue: (item.allergens ?? []).joined(separator: ", "))
        _allergensConfirmed = State(initialValue: item.allergensConfirmed ?? false)
        _active = State(initialValue: item.active)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(isFrench ? "Article" : "Item") {
                    TextField(isFrench ? "Nom" : "Name", text: $name)
                    TextField(priceOptions.isEmpty ? (isFrench ? "Prix" : "Price") : (isFrench ? "Prix de départ (formats ci-dessous)" : "Starting price (formats below)"), text: $price)
                        .keyboardType(.decimalPad)
                    TextField(isFrench ? "Description" : "Description", text: $description, axis: .vertical).lineLimit(3...6)
                }
                Section(isFrench ? "Formats et prix" : "Sizes and prices") {
                    Text(isFrench
                         ? "Ajoutez des choix fixes. Le prix du format sélectionné sera celui de la commande."
                         : "Add fixed options. The selected option’s price will be used for the order.")
                        .font(.mv(size: 12)).foregroundStyle(.secondary)
                    ForEach($priceOptions) { $option in
                        HStack(spacing: 8) {
                            TextField(isFrench ? "Format" : "Option", text: $option.label).frame(minWidth: 70)
                            TextField(isFrench ? "Qté" : "Qty", value: $option.quantity, format: .number).keyboardType(.numberPad).frame(width: 54)
                            TextField(isFrench ? "Prix" : "Price", value: $option.price, format: .number.precision(.fractionLength(2))).keyboardType(.decimalPad).frame(width: 86)
                            Button(role: .destructive) { priceOptions.removeAll { $0.id == option.id } } label: { Image(systemName: "trash") }
                                .accessibilityLabel(isFrench ? "Retirer le format \(option.label)" : "Remove option \(option.label)")
                        }
                    }
                    Button { priceOptions.append(NativeMenuPriceOption(id: UUID().uuidString.lowercased(), label: "", quantity: 1, price: 0.01)) } label: {
                        Label(isFrench ? "Ajouter un format" : "Add option", systemImage: "plus")
                    }.disabled(priceOptions.count >= 20)
                }
                Section(isFrench ? "Disponibilité" : "Availability") { Toggle(isFrench ? "Disponible aux clients" : "Available to customers", isOn: $active) }
                Section(isFrench ? "Allergènes et sécurité" : "Allergens and safety") {
                    TextField(isFrench ? "Allergènes, séparés par des virgules" : "Allergens, separated by commas", text: $allergens, axis: .vertical).lineLimit(2...4)
                    Toggle(isFrench ? "Allergènes vérifiés" : "Allergen information verified", isOn: $allergensConfirmed)
                }
                if item.isDraft == true {
                    Section {
                        Text(isFrench
                             ? "Ce brouillon reste masqué jusqu’à ce qu’un prix et les renseignements sur les allergènes soient confirmés."
                             : "This draft stays hidden until a price and allergen details are confirmed.")
                            .font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft)
                    } header: { Text(isFrench ? "Vérifier le brouillon" : "Review this draft") }
                }
                if let validationMessage {
                    Section { Label(validationMessage, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.orange) }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MinervaColor.cream.ignoresSafeArea())
            .font(.mv(size: 14))
            .navigationTitle(isFrench ? "Modifier l’article" : "Edit item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(isFrench ? "Annuler" : "Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? (isFrench ? "Enregistrement…" : "Saving…") : (isFrench ? "Enregistrer" : "Save")) {
                        guard let amount = Double(price.replacingOccurrences(of: ",", with: ".")), amount.isFinite, amount >= 0 else {
                            validationMessage = isFrench ? "Saisissez un prix valide égal ou supérieur à 0 $." : "Enter a valid price of $0 or more."
                            return
                        }
                        guard priceOptions.allSatisfy({ !$0.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && (1...999).contains($0.quantity) && $0.price.isFinite && $0.price > 0 && $0.price <= 1_000_000 }) else {
                            validationMessage = isFrench ? "Chaque format doit avoir un nom, une quantité entre 1 et 999 et un prix supérieur à 0 $." : "Each option needs a name, a quantity from 1 to 999, and a price above $0."
                            return
                        }
                        if active && item.isDraft == true && !allergensConfirmed {
                            validationMessage = isFrench ? "Confirmez les renseignements sur les allergènes avant d’activer ce brouillon." : "Confirm the allergen information before activating this draft."
                            return
                        }
                        validationMessage = nil
                        saving = true
                        Task {
                            let parsedAllergens = allergens.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
                            let ok = await supabase.updateOwnerMenuItem(item, name: name, price: amount, priceOptions: priceOptions, description: description, active: active, allergens: parsedAllergens, allergensConfirmed: allergensConfirmed)
                            saving = false
                            if ok { dismiss() }
                            else { validationMessage = isFrench ? "L’article n’a pas été enregistré. Vérifiez les champs et réessayez." : "The item was not saved. Check the fields and try again." }
                        }
                    }.disabled(saving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

/// Staff-only guest note, never shown to the guest. Same text as the web customer page.
struct OwnerStaffNoteEditor: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let customer: NativeOwnerCustomer
    @State private var note = ""
    @State private var loaded = false
    @State private var saving = false
    @State private var failed = false
    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(isFrench ? "Ex. Allergie aux noix. Table 4. Aime le Chablis." : "e.g. Nut allergy. Table 4. Likes Chablis.",
                              text: $note, axis: .vertical)
                        .lineLimit(5...12)
                        .disabled(!loaded)
                } header: {
                    Text(isFrench ? "Notes de l'équipe" : "Team notes")
                } footer: {
                    Text(isFrench ? "Visible par l'équipe seulement, jamais par le client." : "Visible to your team only, never to the guest.")
                }
                if failed {
                    Text(isFrench ? "La note n'a pas pu être enregistrée. Réessayez." : "The note could not be saved. Try again.")
                        .font(.footnote).foregroundStyle(.red)
                }
            }
            .scrollContentBackground(.hidden)
            .background(MinervaColor.cream.ignoresSafeArea())
            .font(.mv(size: 14))
            .navigationTitle(customer.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(isFrench ? "Fermer" : "Close") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? (isFrench ? "Enregistrement…" : "Saving…") : (isFrench ? "Enregistrer" : "Save")) {
                        saving = true; failed = false
                        Task {
                            let ok = await supabase.saveOwnerStaffNote(customerId: customer.id, body: note)
                            saving = false
                            if ok { dismiss() } else { failed = true }
                        }
                    }
                    .disabled(saving || !loaded)
                }
            }
            .task {
                note = await supabase.fetchOwnerStaffNote(customerId: customer.id)
                loaded = true
            }
        }
    }
}

struct ReviewReplyEditor: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let review: NativeOwnerRestaurantReview
    @State private var reply: String
    @State private var saving = false
    @State private var failed = false
    private var L: Lx { Lx(storedLanguage) }

    init(review: NativeOwnerRestaurantReview) { self.review = review; _reply = State(initialValue: review.ownerResponse ?? "") }
    var body: some View {
        OwnerFormSheet(title: L("Répondre à l'avis", "Reply to review"), saveTitle: L("Publier", "Publish"),
                       canSave: !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, isSaving: saving,
                       errorMessage: failed ? L("La réponse n'a pas pu être publiée. Réessayez.", "The reply could not be published. Try again.") : nil, onSave: publish) {
            if let comment = review.comment, !comment.isEmpty {
                Section(String(repeating: "★", count: review.rating)) { Text(comment).font(.mv(size: 14)) }
            }
            Section(L("Votre réponse publique", "Your public reply")) {
                TextField(L("Écrivez votre réponse", "Write a response"), text: $reply, axis: .vertical).lineLimit(4...8)
            }
        }
    }
    private func publish() {
        saving = true; failed = false
        Task { let ok = await supabase.updateOwnerReviewResponse(review.id, response: reply); saving = false; if ok { dismiss() } else { failed = true } }
    }
}

struct OwnerManagementDestination: View {
    let route: OwnerManagementRoute
    @ViewBuilder var body: some View {
        switch route {
        case .menu: OwnerMenuScreen()
        case .inventory: OwnerInventoryScreen()
        case .finance: OwnerFinanceView()
        case .reports: OwnerReportsScreen()
        case .team: OwnerEmployeesView()
        case .settings: OwnerSettingsView()
        case .locations: BrandLocationsView(isOwner: true)
        }
    }
}

struct OwnerEmployeesView: View {
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    private var L: Lx { Lx(storedLanguage) }
    @EnvironmentObject private var supabase: SupabaseManager
    @State private var employee: NativeOwnerEmployee?

    var body: some View {
        OwnerScreen(title: L("Équipe", "Team"), subtitle: supabase.ownerEmployees.isEmpty
                                ? L("Aucun membre pour l'instant", "No members yet")
                                : L("\(supabase.ownerEmployees.count) \(supabase.ownerEmployees.count == 1 ? "membre" : "membres") · touchez pour modifier",
                                    "\(supabase.ownerEmployees.count) \(supabase.ownerEmployees.count == 1 ? "member" : "members") · tap to edit")) {
            if supabase.ownerEmployees.isEmpty {
                OwnerCard { OwnerEmptyState(icon: "person.3", title: L("Aucun membre d'équipe", "No team members"),
                                            message: L("Ajoutez votre équipe depuis l'application web. Elle apparaîtra ici.", "Add your team from the web app. It will appear here.")) }
            } else {
                OwnerCard(padding: 6) {
                    VStack(spacing: 0) {
                        ForEach(Array(supabase.ownerEmployees.enumerated()), id: \.element.id) { index, member in
                            if index > 0 { OwnerDivider() }
                            Button { employee = member } label: {
                                OwnerRow(icon: "person.fill", title: member.fullName, subtitle: member.roleTitle) {
                                    OwnerPill(text: member.active ? L("Actif", "Active") : L("Inactif", "Inactive"), tone: member.active ? .good : .neutral)
                                }.padding(.horizontal, 10).padding(.vertical, 4)
                            }.buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .sheet(item: $employee) { EmployeeEditor(employee: $0) }
    }
}

private struct EmployeeEditor: View {
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    private var L: Lx { Lx(storedLanguage) }
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let employee: NativeOwnerEmployee
    @State private var name: String
    @State private var role: String
    @State private var wage: String
    @State private var active: Bool
    @State private var saving = false
    @State private var error: String?
    init(employee: NativeOwnerEmployee) {
        self.employee = employee
        _name = State(initialValue: employee.fullName); _role = State(initialValue: employee.roleTitle)
        _wage = State(initialValue: employee.hourlyWage.map { String(format: "%.2f", $0) } ?? ""); _active = State(initialValue: employee.active)
    }
    var body: some View {
        OwnerFormSheet(title: L("Modifier le membre", "Edit team member"), canSave: !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                       isSaving: saving, errorMessage: error, onSave: save) {
            Section(L("Membre", "Member")) {
                LabeledContent(L("Nom complet", "Full name")) { TextField("", text: $name).multilineTextAlignment(.trailing) }
                LabeledContent(L("Rôle", "Role")) { TextField("", text: $role).multilineTextAlignment(.trailing) }
                LabeledContent(L("Salaire horaire ($)", "Hourly wage ($)")) { TextField("0.00", text: $wage).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
            }
            Section { Toggle(L("Actif", "Active"), isOn: $active).tint(MinervaColor.emerald) }
        }
    }
    private func save() {
        saving = true; error = nil
        Task {
            let amount = Double(wage.replacingOccurrences(of: ",", with: "."))
            let ok = await supabase.updateOwnerEmployee(employee, fullName: name, roleTitle: role, hourlyWage: amount, active: active)
            saving = false
            if ok { dismiss() } else { error = L("Le membre n'a pas été enregistré. Réessayez.", "The team member was not saved. Try again.") }
        }
    }
}

struct InventoryEditor: View {
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    private var L: Lx { Lx(storedLanguage) }
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let item: NativeOwnerInventoryItem
    @State private var quantity: String
    @State private var parLevel: String
    @State private var unitCost: String
    @State private var saving = false
    @State private var error: String?

    init(item: NativeOwnerInventoryItem) {
        self.item = item
        _quantity = State(initialValue: item.quantityOnHand.formatted())
        _parLevel = State(initialValue: item.parLevel?.formatted() ?? "")
        _unitCost = State(initialValue: String(format: "%.2f", item.unitCost))
    }

    private func number(_ text: String) -> Double? { Double(text.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)) }

    var body: some View {
        OwnerFormSheet(title: item.name, canSave: number(quantity) != nil && number(unitCost) != nil && (parLevel.isEmpty || number(parLevel) != nil),
                       isSaving: saving, errorMessage: error, onSave: save) {
            Section {
                LabeledContent(L("En stock (\(item.unit))", "On hand (\(item.unit))")) {
                    TextField("0", text: $quantity).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
                LabeledContent(L("Seuil de réapprovisionnement", "Replenishment target")) {
                    TextField(L("Optionnel", "Optional"), text: $parLevel).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
            } header: { Text(L("Quantités", "Quantities")) } footer: {
                Text(L("Une alerte apparaît à 30 % de ce seuil. Laissez vide si le seuil est inconnu.", "An alert appears at 30% of this target. Leave blank if unknown."))
            }
            Section(L("Coût", "Cost")) {
                LabeledContent(L("Coût unitaire ($)", "Unit cost ($)")) {
                    TextField("0.00", text: $unitCost).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
            }
        }
    }

    private func save() {
        guard let q = number(quantity), let c = number(unitCost) else { return }
        let target = parLevel.trimmingCharacters(in: .whitespaces)
        let parsedTarget = target.isEmpty ? nil : number(target)
        if !target.isEmpty && parsedTarget == nil { return }
        saving = true; error = nil
        Task {
            let ok = await supabase.updateOwnerInventoryItem(item, quantity: q, parLevel: parsedTarget, unitCost: c)
            saving = false
            if ok { Analytics.capture("owner_inventory_item_updated"); dismiss() }
            else { error = L("Les stocks n'ont pas été enregistrés. Réessayez.", "Stock was not saved. Try again.") }
        }
    }
}

struct OwnerFinanceView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    private var L: Lx { Lx(storedLanguage) }

    private var revenue: Double { supabase.ownerTransactions.filter { $0.direction == "in" }.reduce(0) { $0 + $1.amount } }
    private var expenses: Double { supabase.ownerTransactions.filter { $0.direction == "out" }.reduce(0) { $0 + $1.amount } }

    private struct FlowPoint: Identifiable { let id = UUID(); let label: String; let value: Double; let isRevenue: Bool }
    private var revenueVsExpenses: [FlowPoint] {
        [FlowPoint(label: L("Revenus", "Revenue"), value: revenue, isRevenue: true), FlowPoint(label: L("Dépenses", "Expenses"), value: expenses, isRevenue: false)]
    }

    var body: some View {
        OwnerScreen(title: L("Finances", "Finance"), subtitle: supabase.selectedOwnerRestaurant?.name) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                OwnerStatTile(icon: "arrow.down.circle.fill", value: revenue.cad, label: L("Revenus", "Revenue"))
                OwnerStatTile(icon: "arrow.up.circle.fill", value: expenses.cad, label: L("Dépenses", "Expenses"), tone: .bad)
            }
            OwnerStatTile(icon: "equal.circle.fill", value: (revenue - expenses).cad, label: L("Net", "Net"), tone: revenue >= expenses ? .good : .bad)

            if !supabase.ownerTransactions.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    OwnerSectionHeader(title: L("Revenus contre dépenses", "Revenue vs expenses"))
                    OwnerCard {
                        Chart(revenueVsExpenses) { point in
                            BarMark(x: .value(L("Catégorie", "Category"), point.label), y: .value(L("Montant", "Amount"), point.value))
                                .foregroundStyle(point.isRevenue ? MinervaColor.emerald : OwnerTone.bad.color)
                                .cornerRadius(8)
                        }
                        .frame(height: 180).chartYAxis { AxisMarks(position: .leading) }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                OwnerSectionHeader(title: L("Transactions", "Transactions"))
                OwnerCard(padding: 6) {
                    if supabase.ownerTransactions.isEmpty {
                        OwnerEmptyState(icon: "dollarsign.circle", title: L("Aucune transaction", "No transactions"),
                                        message: L("Les transactions de ce lieu apparaîtront ici.", "Transactions from this location will appear here."))
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(supabase.ownerTransactions.enumerated()), id: \.element.id) { index, tx in
                                if index > 0 { OwnerDivider() }
                                OwnerRow(icon: tx.direction == "in" ? "arrow.down.circle.fill" : "arrow.up.circle.fill", title: tx.description,
                                         subtitle: "\(tx.category) · \(tx.date)", tint: tx.direction == "in" ? MinervaColor.emeraldDark : OwnerTone.bad.color) {
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

struct OwnerSettingsView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage("appAppearance") private var storedAppearance = AppAppearance.light.rawValue
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var showSignOutConfirm = false
    @State private var showDeleteAccount = false
    @State private var analyticsEnabled = Analytics.isEnabled
    @State private var replayConsent = Analytics.sessionReplayConsent
    private var L: Lx { Lx(storedLanguage) }
    var body: some View {
        Form {
            Section(L("Apparence", "Appearance")) {
                Picker(L("Thème", "Theme"), selection: $storedAppearance) {
                    ForEach(AppAppearance.allCases) { option in
                        Text(option.label(isFrench: L.fr)).tag(option.rawValue)
                    }
                }
                .pickerStyle(.segmented)
                LanguageMenu(language: Binding(get: { AppLanguage(rawValue: storedLanguage) ?? .fr }, set: { storedLanguage = $0.rawValue }), tint: MinervaColor.emeraldDark)
            }
            Section(L("Emplacement", "Location")) { LabeledContent(L("Emplacement actif", "Active location"), value: supabase.selectedOwnerRestaurant?.name ?? L("Aucun", "None")) }
            Section(L("Notifications", "Notifications")) {
                Text(L("Les alertes de commande utilisent les notifications push, l'affichage dans l'app et le courriel transactionnel. Aucun texto n'est envoyé.",
                       "Order alerts use push, in-app presentation and transactional email. SMS is not used.")).font(.footnote).foregroundStyle(.secondary)
                Link(L("Ouvrir les réglages de notification iOS", "Open iOS notification settings"), destination: URL(string: UIApplication.openSettingsURLString)!)
            }
            Section {
                Toggle(L("Statistiques d'usage anonymes", "Anonymous usage statistics"), isOn: $analyticsEnabled)
                    .tint(MinervaColor.emerald)
                    .onChange(of: analyticsEnabled) { _, value in Analytics.isEnabled = value }
                Toggle(L("Enregistrer mes sessions", "Record my sessions"), isOn: $replayConsent)
                    .tint(MinervaColor.emerald)
                    .disabled(!analyticsEnabled)
                    .onChange(of: replayConsent) { _, value in Analytics.sessionReplayConsent = value }
            } header: { Text(L("Confidentialité", "Privacy")) } footer: {
                Text(L("Aide Minerva Flow à repérer les écrans qui posent problème. Aucun courriel, nom, téléphone ni contenu de commande n'est envoyé. L'enregistrement des sessions est facultatif et masque tous les textes et images.",
                       "Helps Minerva Flow find screens that cause trouble. No email, name, phone or order content is sent. Session recording is optional and masks all text and images."))
            }
            Section(L("Aide", "Support")) { Link(Config.supportEmail, destination: SupportContact.emailURL) }
            Section(L("Compte", "Account")) {
                Button(L("Se déconnecter", "Sign out"), role: .destructive) { showSignOutConfirm = true }
                    .frame(minHeight: 44, alignment: .leading)
                // Deletion in the app and on the web share one server rule: a sole owner of a
                // restaurant must transfer it first.
                Button(L("Supprimer mon compte", "Delete my account"), role: .destructive) { showDeleteAccount = true }
                    .frame(minHeight: 44, alignment: .leading)
                Link(L("Supprimer mon compte sur le web", "Delete my account on the web"),
                     destination: Config.publicLinkBaseURL.appending(path: "/profil"))
                    .font(.footnote)
                    .frame(minHeight: 44, alignment: .leading)
            }
        }
        .scrollContentBackground(.hidden)
        .background(MinervaColor.cream.ignoresSafeArea())
        .font(.mv(size: 15))
        .confirmationDialog(L("Se déconnecter ?", "Sign out?"), isPresented: $showSignOutConfirm, titleVisibility: .visible) {
            Button(L("Se déconnecter", "Sign out"), role: .destructive) { Task { await supabase.signOut() } }
            Button(L("Annuler", "Cancel"), role: .cancel) {}
        }
        .sheet(isPresented: $showDeleteAccount) { DeleteAccountSheet(isOwner: true).environmentObject(supabase) }
        .navigationTitle(L("Paramètres", "Settings"))
        .navigationBarTitleDisplayMode(.inline)
    }
}

import SwiftUI
import Charts

// Owner/manager operations are intentionally native views, backed by the
// caller's RLS-scoped Supabase session. No sample data or service-role key
// is embedded in the app; TestFlight therefore exercises the same isolated
// production records and permissions as the web dashboard.

struct OwnerRestaurantPicker: View {
    @EnvironmentObject private var supabase: SupabaseManager

    var body: some View {
        if supabase.ownerRestaurants.count > 1 {
            Picker("Location", selection: Binding(
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

struct OwnerMenuView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var selectedItem: NativeMenuItem?

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }

    var body: some View {
        NavigationStack {
            List {
                if !supabase.ownerMealSuggestions.isEmpty {
                    Section {
                        ForEach(supabase.ownerMealSuggestions) { suggestion in
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(suggestion.title).font(.headline).foregroundStyle(MinervaColor.ink)
                                    if let description = suggestion.description, !description.isEmpty {
                                        Text(description).font(.caption).foregroundStyle(MinervaColor.inkFaint).lineLimit(2)
                                    }
                                    Label("\(suggestion.voteCount) votes", systemImage: "hand.thumbsup.fill")
                                        .font(.caption2.weight(.semibold)).foregroundStyle(MinervaColor.emeraldDark)
                                }
                                Spacer()
                                if suggestion.status == "draft_added" {
                                    Label {
                                        Text(verbatim: isFrench ? "Brouillon" : "Draft")
                                    } icon: {
                                        Image(systemName: "checkmark.circle.fill")
                                    }
                                    .font(.caption.weight(.semibold)).foregroundStyle(MinervaColor.emeraldDark)
                                } else if suggestion.status == "open" || suggestion.status == "under_review" {
                                    Button {
                                        Task { _ = await supabase.addMealSuggestionAsDraft(suggestion) }
                                    } label: {
                                        Text(verbatim: isFrench
                                            ? (suggestion.status == "under_review" ? "Réessayer" : "Ajouter en brouillon")
                                            : (suggestion.status == "under_review" ? "Retry" : "Add as draft"))
                                    }
                                    .font(.caption.weight(.semibold))
                                    .buttonStyle(.borderedProminent)
                                    .tint(MinervaColor.emeraldDark)
                                }
                            }
                            .padding(.vertical, 3)
                        }
                    } header: {
                        Text(verbatim: isFrench
                            ? "Idées de plats · classées par votes"
                            : "Customer meal ideas · ranked by votes")
                    }
                }
                Section("Official menu · \(supabase.ownerMenuItems.count)") {
                    if supabase.ownerMenuItems.isEmpty {
                        ContentUnavailableView("No menu items", systemImage: "fork.knife", description: Text("Items from this location will appear here."))
                    } else {
                        ForEach(supabase.ownerMenuItems) { item in
                        Button { selectedItem = item } label: {
                            HStack(spacing: 12) {
                                if let urlString = item.imageUrl, let url = URL(string: urlString) {
                                    AsyncImage(url: url) { image in image.resizable().scaledToFill() } placeholder: { Color.gray.opacity(0.12) }
                                        .frame(width: 48, height: 48).clipShape(RoundedRectangle(cornerRadius: 10))
                                } else {
                                    Image(systemName: "fork.knife").frame(width: 48, height: 48).background(MinervaColor.emerald.opacity(0.12)).clipShape(RoundedRectangle(cornerRadius: 10))
                                }
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(item.name).font(.headline).foregroundStyle(MinervaColor.ink)
                                    Text(item.category ?? "Uncategorized").font(.caption).foregroundStyle(MinervaColor.inkFaint)
                                    if item.isDraft == true { Label("Draft · complete details", systemImage: "pencil.line").font(.caption2.weight(.semibold)).foregroundStyle(.orange) }
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text(item.price.cad).font(.subheadline.weight(.semibold)).foregroundStyle(MinervaColor.ink)
                                    Text(item.active ? "Active" : "Inactive").font(.caption2.weight(.bold)).foregroundStyle(item.active ? MinervaColor.emeraldDark : .secondary)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Menu")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
            .refreshable { await supabase.refreshOwnerOperations() }
            .sheet(item: $selectedItem) { MenuItemEditor(item: $0) }
        }
    }
}

private struct MenuItemEditor: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let item: NativeMenuItem
    @State private var name: String
    @State private var price: String
    @State private var description: String
    @State private var allergens: String
    @State private var allergensConfirmed: Bool
    @State private var active: Bool
    @State private var saving = false

    init(item: NativeMenuItem) {
        self.item = item
        _name = State(initialValue: item.name)
        _price = State(initialValue: String(format: "%.2f", item.price))
        _description = State(initialValue: item.description ?? "")
        _allergens = State(initialValue: (item.allergens ?? []).joined(separator: ", "))
        _allergensConfirmed = State(initialValue: item.allergensConfirmed ?? false)
        _active = State(initialValue: item.active)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Item") {
                    TextField("Name", text: $name)
                    TextField("Price", text: $price).keyboardType(.decimalPad)
                    TextField("Description", text: $description, axis: .vertical).lineLimit(3...6)
                }
                Section("Availability") { Toggle("Available to customers", isOn: $active) }
                Section("Allergens & safety") {
                    TextField("Allergens, comma-separated", text: $allergens, axis: .vertical).lineLimit(2...4)
                    Toggle("Allergen information checked", isOn: $allergensConfirmed)
                }
                if item.isDraft == true {
                    Section {
                        Text("This customer idea stays hidden from the live menu until you complete its price and confirm allergen information, then mark it available.")
                            .font(.caption).foregroundStyle(MinervaColor.inkSoft)
                    } header: { Text("Draft review") }
                }
            }
            .navigationTitle("Edit item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") {
                        guard let amount = Double(price.replacingOccurrences(of: ",", with: ".")) else { return }
                        saving = true
                        Task {
                            let parsedAllergens = allergens.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
                            let ok = await supabase.updateOwnerMenuItem(item, name: name, price: amount, description: description, active: active, allergens: parsedAllergens, allergensConfirmed: allergensConfirmed)
                            saving = false
                            if ok { dismiss() }
                        }
                    }.disabled(saving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

struct OwnerLoyaltyView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var respondingTo: NativeOwnerRestaurantReview?
    @State private var counterPhone = ""
    @State private var counterMatches: [NativeOwnerCustomerLookup] = []
    @State private var selectedCounterMatch: NativeOwnerCustomerLookup?
    @State private var confirmedCounterCustomer: NativeCounterCustomer?
    @State private var counterCode = ""
    @State private var counterAmount = ""
    @State private var counterSearching = false
    @State private var counterConfirming = false
    @State private var counterSaving = false
    @State private var counterDidSearch = false
    @State private var counterSuccess: String?

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }
    private var parsedCounterAmount: Double? {
        guard let amount = Double(counterAmount.replacingOccurrences(of: ",", with: ".")),
              amount.isFinite, amount > 0, amount <= 100_000 else { return nil }
        return amount
    }

    var body: some View {
        NavigationStack {
            List {
                Section(isFrench ? "Identifier et créditer une visite" : "Identify and credit a visit") {
                    Text(isFrench
                         ? "Recherchez par téléphone. Le solde reste masqué jusqu’à ce que le client confirme son identité avec le code temporaire de sa carte."
                         : "Search by phone. The balance stays hidden until the customer confirms their identity with the temporary code on their card.")
                        .font(.footnote).foregroundStyle(.secondary)

                    HStack {
                        TextField(isFrench ? "Numéro de téléphone" : "Phone number", text: $counterPhone)
                            .keyboardType(.phonePad)
                            .textContentType(.telephoneNumber)
                        Button {
                            counterSearching = true
                            counterDidSearch = false
                            counterMatches = []
                            selectedCounterMatch = nil
                            confirmedCounterCustomer = nil
                            counterCode = ""
                            counterAmount = ""
                            counterSuccess = nil
                            Task {
                                counterMatches = await supabase.lookupOwnerCustomersByPhone(counterPhone)
                                counterDidSearch = true
                                counterSearching = false
                            }
                        } label: {
                            if counterSearching { ProgressView() }
                            else { Label(isFrench ? "Rechercher" : "Search", systemImage: "magnifyingglass") }
                        }
                        .disabled(counterSearching || counterPhone.filter(\.isNumber).count < 7)
                    }

                    if counterDidSearch && counterMatches.isEmpty && supabase.lastError == nil {
                        Label(
                            isFrench ? "Aucun client trouvé avec ce numéro." : "No customer found for that number.",
                            systemImage: "person.crop.circle.badge.questionmark"
                        ).font(.footnote).foregroundStyle(.secondary)
                    }

                    ForEach(counterMatches) { match in
                        Button {
                            selectedCounterMatch = match
                            confirmedCounterCustomer = nil
                            counterCode = ""
                            counterAmount = ""
                            counterSuccess = nil
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(match.name).font(.headline).foregroundStyle(MinervaColor.ink)
                                    if let phone = match.phone { Text(phone).font(.caption).foregroundStyle(.secondary) }
                                }
                                Spacer()
                                if selectedCounterMatch?.id == match.id { Image(systemName: "checkmark.circle.fill").foregroundStyle(MinervaColor.emeraldDark) }
                            }
                        }
                        .buttonStyle(.plain)
                        .disabled(counterConfirming)
                    }

                    if let selected = selectedCounterMatch, confirmedCounterCustomer == nil {
                        Text(isFrench
                             ? "Demandez au client d’ouvrir sa carte et de vous communiquer le code actuel à 6 chiffres."
                             : "Ask the customer to open their card and share the current 6-digit code.")
                            .font(.footnote).foregroundStyle(.secondary)
                        HStack {
                            TextField(isFrench ? "Code client" : "Customer code", text: $counterCode)
                                .keyboardType(.numberPad)
                                .textContentType(.oneTimeCode)
                                .monospacedDigit()
                            Button {
                                counterConfirming = true
                                Task {
                                    confirmedCounterCustomer = await supabase.confirmOwnerCustomerIdentity(selected, code: counterCode)
                                    counterConfirming = false
                                    if confirmedCounterCustomer == nil {
                                        counterSuccess = nil
                                    }
                                }
                            } label: {
                                if counterConfirming { ProgressView() }
                                else { Text(isFrench ? "Confirmer" : "Confirm") }
                            }
                            .disabled(counterConfirming || counterCode.count != 6)
                        }
                    }

                    if let customer = confirmedCounterCustomer {
                        Label(isFrench ? "Identité confirmée" : "Identity confirmed", systemImage: "checkmark.seal.fill")
                            .font(.subheadline.weight(.semibold)).foregroundStyle(MinervaColor.emeraldDark)
                        Text("\(customer.name) · \(customer.loyaltyPoints) \(isFrench ? "points" : "points") · \(customer.visitCount) \(isFrench ? "visites" : "visits")")
                            .font(.footnote).foregroundStyle(MinervaColor.ink)
                        TextField(isFrench ? "Montant de l’achat" : "Purchase amount", text: $counterAmount)
                            .keyboardType(.decimalPad)
                        Button {
                            guard let amount = parsedCounterAmount else { return }
                            counterSaving = true
                            counterSuccess = nil
                            Task {
                                if let updated = await supabase.recordOwnerCustomerVisit(customer: customer, amountSpent: amount) {
                                    confirmedCounterCustomer = NativeCounterCustomer(
                                        id: updated.id,
                                        name: updated.name,
                                        phone: updated.phone,
                                        loyaltyPoints: updated.loyaltyPoints,
                                        visitCount: updated.visitCount,
                                        totalSpent: updated.totalSpent
                                    )
                                    counterSuccess = isFrench ? "Visite enregistrée et points crédités." : "Visit recorded and points credited."
                                    counterAmount = ""
                                }
                                counterSaving = false
                            }
                        } label: {
                            if counterSaving { ProgressView() }
                            else { Label(isFrench ? "Enregistrer la visite" : "Record visit", systemImage: "plus.circle.fill") }
                        }
                        .disabled(counterSaving || parsedCounterAmount == nil)
                        if let counterSuccess {
                            Text(counterSuccess).font(.footnote.weight(.medium)).foregroundStyle(MinervaColor.emeraldDark)
                        }
                    }
                }

                Section(isFrench ? "Clients" : "Customers") {
                    if supabase.ownerCustomers.isEmpty {
                        Text(isFrench ? "Aucun client pour le moment." : "No customers yet.").foregroundStyle(.secondary)
                    }
                    ForEach(supabase.ownerCustomers) { customer in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(customer.name).font(.headline)
                            Text(isFrench
                                 ? "\(customer.loyaltyPoints) points · \(customer.visitCount) visites · \(customer.totalSpent.cad)"
                                 : "\(customer.loyaltyPoints) points · \(customer.visitCount) visits · \(customer.totalSpent.cad)")
                                .font(.caption).foregroundStyle(.secondary)
                            if let email = customer.email { Text(email).font(.caption2).foregroundStyle(.secondary) }
                        }
                    }
                }
                Section(isFrench ? "Récompenses" : "Rewards") {
                    if supabase.ownerRewards.isEmpty {
                        Text(isFrench ? "Aucune récompense pour le moment." : "No rewards yet.").foregroundStyle(.secondary)
                    }
                    ForEach(supabase.ownerRewards) { reward in
                        HStack { VStack(alignment: .leading) { Text(reward.name); if let description = reward.description { Text(description).font(.caption).foregroundStyle(.secondary) } }; Spacer(); Text("\(reward.pointsCost) pts").font(.caption.weight(.semibold)) }
                    }
                }
                Section(isFrench ? "Offres" : "Offers") {
                    if supabase.ownerOffers.isEmpty {
                        Text(isFrench ? "Aucune offre pour le moment." : "No offers yet.").foregroundStyle(.secondary)
                    }
                    ForEach(supabase.ownerOffers) { offer in
                        HStack { VStack(alignment: .leading) { Text(offer.title); if let description = offer.description { Text(description).font(.caption).foregroundStyle(.secondary) } }; Spacer(); Text(offer.active ? (isFrench ? "Active" : "Live") : (isFrench ? "En pause" : "Paused")).font(.caption.weight(.semibold)).foregroundStyle(offer.active ? MinervaColor.emeraldDark : .secondary) }
                    }
                }
                Section(isFrench ? "Avis et réponses" : "Reviews and replies") {
                    if supabase.ownerReviews.isEmpty {
                        Text(isFrench ? "Aucun avis pour le moment." : "No reviews yet.").foregroundStyle(.secondary)
                    }
                    ForEach(supabase.ownerReviews) { review in
                        Button { respondingTo = review } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(String(repeating: "★", count: review.rating)).foregroundStyle(.orange)
                                if let comment = review.comment, !comment.isEmpty { Text(comment).foregroundStyle(MinervaColor.ink) }
                                Text(review.ownerResponse?.isEmpty == false
                                     ? (isFrench ? "Réponse envoyée" : "Reply sent")
                                     : (isFrench ? "Répondre à cet avis" : "Reply to this review"))
                                    .font(.caption).foregroundStyle(MinervaColor.emeraldDark)
                            }
                        }.buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle(isFrench ? "Fidélité" : "Loyalty")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
            .refreshable { await supabase.refreshOwnerOperations() }
            .sheet(item: $respondingTo) { ReviewReplyEditor(review: $0) }
        }
    }
}

private struct ReviewReplyEditor: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let review: NativeOwnerRestaurantReview
    @State private var reply: String
    @State private var saving = false

    init(review: NativeOwnerRestaurantReview) { self.review = review; _reply = State(initialValue: review.ownerResponse ?? "") }
    var body: some View {
        NavigationStack {
            Form { Section("Your public reply") { TextField("Write a response", text: $reply, axis: .vertical).lineLimit(4...8) } }
                .navigationTitle("Review reply")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button(saving ? "Saving…" : "Publish") { saving = true; Task { let ok = await supabase.updateOwnerReviewResponse(review.id, response: reply); saving = false; if ok { dismiss() } } }.disabled(saving || reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }
                }
        }
    }
}

struct OwnerManagementView: View {
    @State private var showAmbassadorProgram = false
    var body: some View {
        NavigationStack {
            List {
                Section("Operations") {
                    NavigationLink("Team", destination: OwnerEmployeesView())
                    NavigationLink("Inventory", destination: OwnerInventoryView())
                    NavigationLink("Finance", destination: OwnerFinanceView())
                }
                Section("Performance") { NavigationLink("Reports", destination: OwnerReportsView()) }
                Section("Growth") {
                    Button { showAmbassadorProgram = true } label: { Label("Ambassador program", systemImage: "megaphone.fill") }
                }
                Section("Account") { NavigationLink("Settings", destination: OwnerSettingsView()) }
            }
            .navigationTitle("Manage")
            .sheet(isPresented: $showAmbassadorProgram) { FlowAmbassadorMobileView() }
        }
    }
}

struct OwnerEmployeesView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @State private var employee: NativeOwnerEmployee?
    var body: some View {
        List(supabase.ownerEmployees) { member in
            Button { employee = member } label: {
                HStack { VStack(alignment: .leading, spacing: 3) { Text(member.fullName).font(.headline); Text(member.roleTitle).font(.caption).foregroundStyle(.secondary) }; Spacer(); Text(member.active ? "Active" : "Inactive").font(.caption.weight(.semibold)).foregroundStyle(member.active ? MinervaColor.emeraldDark : .secondary) }
            }.buttonStyle(.plain)
        }
        .overlay { if supabase.ownerEmployees.isEmpty { ContentUnavailableView("No team members", systemImage: "person.3", description: Text("Team members from this location will appear here.")) } }
        .navigationTitle("Team")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
        .sheet(item: $employee) { EmployeeEditor(employee: $0) }
    }
}

private struct EmployeeEditor: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let employee: NativeOwnerEmployee
    @State private var name: String
    @State private var role: String
    @State private var wage: String
    @State private var active: Bool
    @State private var saving = false
    init(employee: NativeOwnerEmployee) { self.employee = employee; _name = State(initialValue: employee.fullName); _role = State(initialValue: employee.roleTitle); _wage = State(initialValue: employee.hourlyWage.map { String(format: "%.2f", $0) } ?? ""); _active = State(initialValue: employee.active) }
    var body: some View {
        NavigationStack { Form { Section("Team member") { TextField("Full name", text: $name); TextField("Role", text: $role); TextField("Hourly wage", text: $wage).keyboardType(.decimalPad) }; Section { Toggle("Active", isOn: $active) } }
            .navigationTitle("Edit team member")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button(saving ? "Saving…" : "Save") { saving = true; Task { let amount = Double(wage.replacingOccurrences(of: ",", with: ".")); let ok = await supabase.updateOwnerEmployee(employee, fullName: name, roleTitle: role, hourlyWage: amount, active: active); saving = false; if ok { dismiss() } } }.disabled(saving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) } }
        }
    }
}

struct OwnerInventoryView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @State private var selected: NativeOwnerInventoryItem?
    var body: some View {
        List(supabase.ownerInventoryItems) { item in
            Button { selected = item } label: {
                HStack { VStack(alignment: .leading, spacing: 3) { Text(item.name).font(.headline); Text("\(item.quantityOnHand.formatted()) \(item.unit) on hand · par \(item.parLevel.formatted())").font(.caption).foregroundStyle(item.quantityOnHand <= item.parLevel ? .orange : .secondary) }; Spacer(); Text(item.unitCost.cad).font(.caption.weight(.semibold)) }
            }.buttonStyle(.plain)
        }
        .overlay { if supabase.ownerInventoryItems.isEmpty { ContentUnavailableView("No inventory items", systemImage: "shippingbox", description: Text("Inventory from this location will appear here.")) } }
        .navigationTitle("Inventory")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
        .sheet(item: $selected) { InventoryEditor(item: $0) }
    }
}

private struct InventoryEditor: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let item: NativeOwnerInventoryItem
    @State private var quantity: String
    @State private var parLevel: String
    @State private var unitCost: String
    @State private var saving = false
    init(item: NativeOwnerInventoryItem) { self.item = item; _quantity = State(initialValue: item.quantityOnHand.formatted()); _parLevel = State(initialValue: item.parLevel.formatted()); _unitCost = State(initialValue: String(format: "%.2f", item.unitCost)) }
    var body: some View {
        NavigationStack { Form { Section(item.name) { TextField("Quantity on hand (\(item.unit))", text: $quantity).keyboardType(.decimalPad); TextField("Par level", text: $parLevel).keyboardType(.decimalPad); TextField("Unit cost", text: $unitCost).keyboardType(.decimalPad) } }
            .navigationTitle("Edit inventory")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button(saving ? "Saving…" : "Save") { guard let q = Double(quantity.replacingOccurrences(of: ",", with: ".")), let p = Double(parLevel.replacingOccurrences(of: ",", with: ".")), let c = Double(unitCost.replacingOccurrences(of: ",", with: ".")) else { return }; saving = true; Task { let ok = await supabase.updateOwnerInventoryItem(item, quantity: q, parLevel: p, unitCost: c); saving = false; if ok { dismiss() } } }.disabled(saving) } }
        }
    }
}

struct OwnerFinanceView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    private var revenue: Double { supabase.ownerTransactions.filter { $0.direction == "in" }.reduce(0) { $0 + $1.amount } }
    private var expenses: Double { supabase.ownerTransactions.filter { $0.direction == "out" }.reduce(0) { $0 + $1.amount } }
    var body: some View {
        List {
            Section("Summary") { HStack { OwnerSummaryMetric(title: "Revenue", value: revenue.cad); Spacer(); OwnerSummaryMetric(title: "Expenses", value: expenses.cad); Spacer(); OwnerSummaryMetric(title: "Net", value: (revenue - expenses).cad) } }
            Section("Transactions") { ForEach(supabase.ownerTransactions) { transaction in HStack { VStack(alignment: .leading, spacing: 3) { Text(transaction.description); Text("\(transaction.category) · \(transaction.date)").font(.caption).foregroundStyle(.secondary) }; Spacer(); Text(transaction.amount.cad).foregroundStyle(transaction.direction == "in" ? MinervaColor.emeraldDark : .red) } } }
        }
        .navigationTitle("Finance")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
    }
}

struct OwnerReportsView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    private var netByCategory: [(name: String, total: Double)] {
        Dictionary(grouping: supabase.ownerTransactions, by: \.category).map { key, values in (key, values.reduce(0) { total, tx in total + (tx.direction == "in" ? tx.amount : -tx.amount) }) }.sorted { $0.total > $1.total }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Business performance").font(MinervaFont.display(30, weight: .semibold))
                Text("Live data for the selected location. Every section expands to use the full page instead of leaving an empty report canvas.").font(.subheadline).foregroundStyle(.secondary)
                HStack(spacing: 12) { OwnerMetric(title: "Monthly sales", value: supabase.ownerMetrics.monthRevenue.cad, icon: "chart.line.uptrend.xyaxis"); OwnerMetric(title: "Orders", value: "\(supabase.ownerMetrics.monthOrders)", icon: "list.clipboard") }
                VStack(alignment: .leading, spacing: 12) {
                    Text("Net by category").font(MinervaFont.display(22, weight: .semibold))
                    if netByCategory.isEmpty { ContentUnavailableView("No finance data", systemImage: "chart.bar", description: Text("Transactions will appear here as they are recorded.")) }
                    else { Chart(netByCategory, id: \.name) { entry in BarMark(x: .value("Category", entry.name), y: .value("Net", entry.total)).foregroundStyle(entry.total >= 0 ? MinervaColor.emeraldDark : .red) }.frame(height: 280).chartYAxis { AxisMarks(position: .leading) } }
                }.frame(maxWidth: .infinity, alignment: .leading).padding(18).background(MinervaColor.surface).clipShape(RoundedRectangle(cornerRadius: 18))
                VStack(alignment: .leading, spacing: 10) { Text("Recent activity").font(MinervaFont.display(22, weight: .semibold)); ForEach(supabase.ownerTransactions.prefix(12)) { tx in HStack { Text(tx.date).font(.caption.monospacedDigit()).foregroundStyle(.secondary); Text(tx.description); Spacer(); Text(tx.amount.cad).font(.subheadline.weight(.semibold)) }.padding(.vertical, 4) } }.frame(maxWidth: .infinity, alignment: .leading).padding(18).background(MinervaColor.surface).clipShape(RoundedRectangle(cornerRadius: 18))
            }.padding(20)
        }.background(MinervaColor.cream.ignoresSafeArea()).navigationTitle("Reports").toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
    }
}

struct OwnerSettingsView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage("appAppearance") private var storedAppearance = AppAppearance.light.rawValue
    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $storedAppearance) {
                    ForEach(AppAppearance.allCases) { option in
                        Text(option.label(isFrench: false)).tag(option.rawValue)
                    }
                }
                .pickerStyle(.segmented)
            }
            Section("Location") { LabeledContent("Selected location", value: supabase.selectedOwnerRestaurant?.name ?? "None") }
            Section("Notifications") {
                Text("Order-ready messages use push, in-app presentation and transactional email. SMS is not used.").font(.footnote).foregroundStyle(.secondary)
                Link("Open iOS notification settings", destination: URL(string: UIApplication.openSettingsURLString)!)
            }
            Section("Subscription") { Text("Software subscriptions are managed on a computer. No in-app purchase is offered in this iOS app.").font(.footnote).foregroundStyle(.secondary) }
            Section("Support") { Link("theminervabrand@gmail.com", destination: URL(string: "mailto:theminervabrand@gmail.com")!) }
        }
        .navigationTitle("Settings")
    }
}

private struct OwnerSummaryMetric: View { let title: String; let value: String; var body: some View { VStack(alignment: .leading, spacing: 4) { Text(value).font(.headline).foregroundStyle(MinervaColor.ink); Text(title).font(.caption).foregroundStyle(.secondary) } } }

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
                            Label(isFrench ? "\(suggestion.voteCount) votes" : "\(suggestion.voteCount) votes", systemImage: "hand.thumbsup.fill")
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
                Section(isFrench ? "Menu officiel · \(supabase.ownerMenuItems.count)" : "Official menu · \(supabase.ownerMenuItems.count)") {
                    if supabase.ownerMenuItems.isEmpty {
                        ContentUnavailableView(
                            isFrench ? "Aucun article au menu" : "No menu items",
                            systemImage: "fork.knife",
                            description: Text(isFrench ? "Les articles de cet emplacement apparaîtront ici." : "Items from this location will appear here.")
                        )
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
                                        Text(item.category ?? (isFrench ? "Sans catégorie" : "Uncategorized")).font(.caption).foregroundStyle(MinervaColor.inkFaint)
                                        if item.isDraft == true {
                                            Label(isFrench ? "Brouillon · détails à compléter" : "Draft · complete details", systemImage: "pencil.line")
                                                .font(.caption2.weight(.semibold)).foregroundStyle(.orange)
                                        }
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing, spacing: 4) {
                                        Text(item.priceOptions.flatMap { $0.map(\.price).min() }.map { (isFrench ? "À partir de " : "From ") + $0.cad } ?? item.price.cad)
                                            .font(.subheadline.weight(.semibold)).foregroundStyle(MinervaColor.ink)
                                        Text(item.active ? (isFrench ? "Actif" : "Active") : (isFrench ? "Inactif" : "Inactive"))
                                            .font(.caption2.weight(.bold)).foregroundStyle(item.active ? MinervaColor.emeraldDark : .secondary)
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
            .navigationTitle(isFrench ? "Menu" : "Menu")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
            .refreshable { await supabase.refreshOwnerOperations() }
            .sheet(item: $selectedItem) { MenuItemEditor(item: $0, isFrench: isFrench) }
        }
    }
}

private struct MenuItemEditor: View {
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
                        .font(.caption).foregroundStyle(.secondary)
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
                            .font(.caption).foregroundStyle(MinervaColor.inkSoft)
                    } header: { Text(isFrench ? "Vérifier le brouillon" : "Review this draft") }
                }
                if let validationMessage {
                    Section { Label(validationMessage, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.orange) }
                }
            }
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

struct OwnerLoyaltyView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var respondingTo: NativeOwnerRestaurantReview?
    @State private var notingCustomer: NativeOwnerCustomer?
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
                        Button { notingCustomer = customer } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(customer.name).font(.headline).foregroundStyle(MinervaColor.ink)
                                    Text(isFrench
                                         ? "\(customer.loyaltyPoints) points · \(customer.visitCount) visites · \(customer.totalSpent.cad)"
                                         : "\(customer.loyaltyPoints) points · \(customer.visitCount) visits · \(customer.totalSpent.cad)")
                                        .font(.caption).foregroundStyle(.secondary)
                                    if let email = customer.email { Text(email).font(.caption2).foregroundStyle(.secondary) }
                                }
                                Spacer()
                                Image(systemName: "note.text").foregroundStyle(MinervaColor.emeraldDark)
                                    .accessibilityLabel(isFrench ? "Notes de l'équipe" : "Team notes")
                            }
                            .frame(minHeight: 44)
                        }
                        .buttonStyle(.plain)
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
            .sheet(item: $notingCustomer) { OwnerStaffNoteEditor(customer: $0) }
        }
    }
}

/// Staff-only guest note, never shown to the guest. Same text as the web customer page.
private struct OwnerStaffNoteEditor: View {
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
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var showAmbassadorProgram = false
    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }

    var body: some View {
        NavigationStack {
            List {
                Section(isFrench ? "Gestion quotidienne" : "Daily operations") {
                    NavigationLink(isFrench ? "Équipe" : "Team", destination: OwnerEmployeesView())
                    NavigationLink(isFrench ? "Inventaire" : "Inventory", destination: OwnerInventoryView())
                    NavigationLink(isFrench ? "Finances" : "Finance", destination: OwnerFinanceView())
                }
                Section(isFrench ? "Performance" : "Performance") {
                    NavigationLink(isFrench ? "Rapports" : "Reports", destination: OwnerReportsView())
                }
                Section(isFrench ? "Développement" : "Growth") {
                    Button { showAmbassadorProgram = true } label: {
                        Label(isFrench ? "Programme ambassadeur" : "Ambassador program", systemImage: "megaphone.fill")
                    }
                    NavigationLink(isFrench ? "Tags NFC" : "NFC tags", destination: OwnerNFCView())
                    NavigationLink("Google Business Profile", destination: OwnerGoogleBusinessProfileView())
                }
                Section(isFrench ? "Compte" : "Account") {
                    NavigationLink(isFrench ? "Paramètres" : "Settings", destination: OwnerSettingsView())
                    NavigationLink(isFrench ? "Mises à jour" : "Updates", destination: NativeChangelogView(audience: "owner"))
                }
            }
            .navigationTitle(isFrench ? "Gestion" : "Manage")
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

    private var lowStockCount: Int {
        supabase.ownerInventoryItems.filter { item in
            guard let target = item.parLevel, target > 0 else { return false }
            return item.quantityOnHand <= target * 0.3
        }.count
    }

    var body: some View {
        List {
            if lowStockCount > 0 {
                Section {
                    Label("\(lowStockCount) item\(lowStockCount == 1 ? "" : "s") at or below 30% of target", systemImage: "exclamationmark.triangle.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.red)
                } footer: {
                    Text("Counts follow recipes configured for each menu item. Set a target to receive a reliable low-stock alert.")
                }
            }
            Section("Items · \(supabase.ownerInventoryItems.count)") {
                ForEach(supabase.ownerInventoryItems) { item in
                    Button { selected = item } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(item.name).font(.headline)
                                Text("\(item.quantityOnHand.formatted()) \(item.unit) on hand · target \(item.parLevel?.formatted() ?? "—")")
                                    .font(.caption)
                                    .foregroundStyle(inLowStock(item) ? .red : (belowTarget(item) ? .orange : .secondary))
                                if inLowStock(item) {
                                    Text("Reorder soon · at or below 30%")
                                        .font(.caption2.weight(.semibold)).foregroundStyle(.red)
                                }
                            }
                            Spacer()
                            Text(item.unitCost.cad).font(.caption.weight(.semibold))
                        }
                    }.buttonStyle(.plain)
                }
            }
        }
        .overlay { if supabase.ownerInventoryItems.isEmpty { ContentUnavailableView("No inventory items", systemImage: "shippingbox", description: Text("Inventory from this location will appear here.")) } }
        .navigationTitle("Inventory")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
        .sheet(item: $selected) { InventoryEditor(item: $0) }
    }

    private func belowTarget(_ item: NativeOwnerInventoryItem) -> Bool {
        guard let target = item.parLevel, target > 0 else { return false }
        return item.quantityOnHand < target
    }

    private func inLowStock(_ item: NativeOwnerInventoryItem) -> Bool {
        guard let target = item.parLevel, target > 0 else { return false }
        return item.quantityOnHand <= target * 0.3
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

    init(item: NativeOwnerInventoryItem) {
        self.item = item
        _quantity = State(initialValue: item.quantityOnHand.formatted())
        _parLevel = State(initialValue: item.parLevel?.formatted() ?? "")
        _unitCost = State(initialValue: String(format: "%.2f", item.unitCost))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(item.name) {
                    TextField("Quantity on hand (\(item.unit))", text: $quantity).keyboardType(.decimalPad)
                    TextField("Replenishment target", text: $parLevel).keyboardType(.decimalPad)
                    Text("A low-stock alert appears in app at 30% of this target. Leave blank if unknown.").font(.footnote).foregroundStyle(.secondary)
                    TextField("Unit cost", text: $unitCost).keyboardType(.decimalPad)
                }
            }
            .navigationTitle("Edit inventory")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") {
                        guard let q = Double(quantity.replacingOccurrences(of: ",", with: ".")),
                              let c = Double(unitCost.replacingOccurrences(of: ",", with: ".")) else { return }
                        let targetText = parLevel.trimmingCharacters(in: .whitespacesAndNewlines)
                        let parsedTarget = targetText.isEmpty ? nil : Double(targetText.replacingOccurrences(of: ",", with: "."))
                        if !targetText.isEmpty && parsedTarget == nil { return }
                        saving = true
                        Task {
                            let ok = await supabase.updateOwnerInventoryItem(item, quantity: q, parLevel: parsedTarget, unitCost: c)
                            saving = false
                            if ok { dismiss() }
                        }
                    }.disabled(saving)
                }
            }
        }
    }
}

struct OwnerFinanceView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }

    private var revenue: Double { supabase.ownerTransactions.filter { $0.direction == "in" }.reduce(0) { $0 + $1.amount } }
    private var expenses: Double { supabase.ownerTransactions.filter { $0.direction == "out" }.reduce(0) { $0 + $1.amount } }

    private struct FlowPoint: Identifiable { let id = UUID(); let label: String; let value: Double }
    private var revenueVsExpenses: [FlowPoint] {
        [
            FlowPoint(label: isFrench ? "Revenus" : "Revenue", value: revenue),
            FlowPoint(label: isFrench ? "Dépenses" : "Expenses", value: expenses),
        ]
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(isFrench ? "Finances" : "Finance")
                    .font(MinervaFont.display(30, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)

                HStack(spacing: 12) {
                    OwnerMetric(title: isFrench ? "Revenus" : "Revenue", value: revenue.cad, icon: "arrow.down.circle.fill")
                    OwnerMetric(title: isFrench ? "Dépenses" : "Expenses", value: expenses.cad, icon: "arrow.up.circle.fill")
                    OwnerMetric(title: isFrench ? "Net" : "Net", value: (revenue - expenses).cad, icon: "equal.circle.fill")
                }

                if !supabase.ownerTransactions.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(isFrench ? "Revenus contre dépenses" : "Revenue vs expenses")
                            .font(MinervaFont.display(22, weight: .semibold))
                        Chart(revenueVsExpenses) { point in
                            BarMark(x: .value(isFrench ? "Catégorie" : "Category", point.label), y: .value(isFrench ? "Montant" : "Amount", point.value))
                                .foregroundStyle(point.label == (isFrench ? "Revenus" : "Revenue") ? MinervaColor.emeraldDark : .red)
                        }
                        .frame(height: 180)
                        .chartYAxis { AxisMarks(position: .leading) }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(18)
                    .background(MinervaColor.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text(isFrench ? "Transactions" : "Transactions")
                        .font(MinervaFont.display(22, weight: .semibold))
                    if supabase.ownerTransactions.isEmpty {
                        ContentUnavailableView(
                            isFrench ? "Aucune transaction" : "No transactions",
                            systemImage: "dollarsign.circle",
                            description: Text(isFrench ? "Les transactions de ce lieu apparaîtront ici." : "Transactions from this location will appear here.")
                        )
                    } else {
                        ForEach(supabase.ownerTransactions) { transaction in
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(transaction.description).font(.subheadline.weight(.medium)).foregroundStyle(MinervaColor.ink)
                                    Text("\(transaction.category) · \(transaction.date)").font(.caption).foregroundStyle(MinervaColor.inkFaint)
                                }
                                Spacer()
                                Text(transaction.amount.cad)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(transaction.direction == "in" ? MinervaColor.emeraldDark : .red)
                            }
                            .padding(14)
                            .background(MinervaColor.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(MinervaColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 18))
            }
            .padding(20)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Finances" : "Finance")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
    }
}

struct OwnerReportsView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }

    private var netByCategory: [(name: String, total: Double)] {
        Dictionary(grouping: supabase.ownerTransactions, by: \.category).map { key, values in (key, values.reduce(0) { total, tx in total + (tx.direction == "in" ? tx.amount : -tx.amount) }) }.sorted { $0.total > $1.total }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(isFrench ? "Performance de l'entreprise" : "Business performance").font(MinervaFont.display(30, weight: .semibold))
                Text(isFrench
                     ? "Données en direct pour l'emplacement sélectionné. Chaque section occupe toute la page plutôt que de laisser un canevas de rapport vide."
                     : "Live data for the selected location. Every section expands to use the full page instead of leaving an empty report canvas.")
                    .font(.subheadline).foregroundStyle(.secondary)
                HStack(spacing: 12) {
                    OwnerMetric(title: isFrench ? "Ventes mensuelles" : "Monthly sales", value: supabase.ownerMetrics.monthRevenue.cad, icon: "chart.line.uptrend.xyaxis")
                    OwnerMetric(title: isFrench ? "Commandes" : "Orders", value: "\(supabase.ownerMetrics.monthOrders)", icon: "list.clipboard")
                }
                VStack(alignment: .leading, spacing: 12) {
                    Text(isFrench ? "Net par catégorie" : "Net by category").font(MinervaFont.display(22, weight: .semibold))
                    if netByCategory.isEmpty {
                        ContentUnavailableView(
                            isFrench ? "Aucune donnée financière" : "No finance data",
                            systemImage: "chart.bar",
                            description: Text(isFrench ? "Les transactions apparaîtront ici au fur et à mesure." : "Transactions will appear here as they are recorded.")
                        )
                    } else {
                        Chart(netByCategory, id: \.name) { entry in
                            BarMark(x: .value(isFrench ? "Catégorie" : "Category", entry.name), y: .value("Net", entry.total))
                                .foregroundStyle(entry.total >= 0 ? MinervaColor.emeraldDark : .red)
                        }
                        .frame(height: 280)
                        .chartYAxis { AxisMarks(position: .leading) }
                    }
                }.frame(maxWidth: .infinity, alignment: .leading).padding(18).background(MinervaColor.surface).clipShape(RoundedRectangle(cornerRadius: 18))
                VStack(alignment: .leading, spacing: 10) {
                    Text(isFrench ? "Activité récente" : "Recent activity").font(MinervaFont.display(22, weight: .semibold))
                    if supabase.ownerTransactions.isEmpty {
                        ContentUnavailableView(
                            isFrench ? "Aucune activité" : "No activity",
                            systemImage: "clock",
                            description: Text(isFrench ? "L'activité récente apparaîtra ici." : "Recent activity will appear here.")
                        )
                    } else {
                        ForEach(supabase.ownerTransactions.prefix(12)) { tx in
                            HStack {
                                Text(tx.date).font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                                Text(tx.description)
                                Spacer()
                                Text(tx.amount.cad).font(.subheadline.weight(.semibold))
                            }.padding(.vertical, 4)
                        }
                    }
                }.frame(maxWidth: .infinity, alignment: .leading).padding(18).background(MinervaColor.surface).clipShape(RoundedRectangle(cornerRadius: 18))
            }.padding(20)
        }.background(MinervaColor.cream.ignoresSafeArea()).navigationTitle(isFrench ? "Rapports" : "Reports").toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
    }
}

struct OwnerSettingsView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage("appAppearance") private var storedAppearance = AppAppearance.light.rawValue
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var showSignOutConfirm = false
    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }
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
            Section("Support") { Link(Config.supportEmail, destination: SupportContact.emailURL) }
            Section(isFrench ? "Compte" : "Account") {
                Button(isFrench ? "Se déconnecter" : "Sign out", role: .destructive) { showSignOutConfirm = true }
                    .frame(minHeight: 44, alignment: .leading)
                // Owner accounts own restaurants and team data, so deletion runs through the web
                // profile page, which applies the owner-specific checks.
                Link(isFrench ? "Supprimer mon compte (sur le web)" : "Delete my account (on the web)",
                     destination: Config.publicLinkBaseURL.appending(path: "/profil"))
                    .foregroundStyle(.red)
                    .frame(minHeight: 44, alignment: .leading)
            }
        }
        .confirmationDialog(isFrench ? "Se déconnecter ?" : "Sign out?", isPresented: $showSignOutConfirm, titleVisibility: .visible) {
            Button(isFrench ? "Se déconnecter" : "Sign out", role: .destructive) { Task { await supabase.signOut() } }
            Button(isFrench ? "Annuler" : "Cancel", role: .cancel) {}
        }
        .navigationTitle(isFrench ? "Paramètres" : "Settings")
    }
}

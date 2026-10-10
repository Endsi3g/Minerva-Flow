import SwiftUI

/// Create or edit an offer from the phone. A new offer can notify customers
/// who turned notifications on (server sends it once, only if live now).
struct OwnerOfferSheet: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let offer: Offer?

    @State private var offerId: String
    @State private var title: String
    @State private var details: String
    @State private var price: String
    @State private var imageURL: String?
    @State private var active: Bool
    @State private var scheduled: Bool
    @State private var startsAt: Date
    @State private var hasEnd: Bool
    @State private var endsAt: Date
    @State private var notifyCustomers = true
    @State private var saving = false
    @State private var error: String?
    @State private var confirmDelete = false
    private var L: Lx { Lx(storedLanguage) }

    init(offer: Offer?) {
        self.offer = offer
        _offerId = State(initialValue: offer?.id ?? UUID().uuidString.lowercased())
        _title = State(initialValue: offer?.title ?? "")
        _details = State(initialValue: offer?.description ?? "")
        _price = State(initialValue: offer?.price.map { String(format: "%.2f", $0) } ?? "")
        _imageURL = State(initialValue: offer?.imageUrl)
        _active = State(initialValue: offer?.active ?? true)
        _scheduled = State(initialValue: offer?.startsAt != nil)
        _startsAt = State(initialValue: offer?.startsAt ?? Date())
        _hasEnd = State(initialValue: offer?.endsAt != nil)
        _endsAt = State(initialValue: offer?.endsAt ?? Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date())
    }

    private var parsedPrice: Double? {
        let text = price.trimmingCharacters(in: .whitespaces)
        if text.isEmpty { return nil }
        return Double(text.replacingOccurrences(of: ",", with: ".")).flatMap { $0.isFinite && $0 >= 0 ? $0 : nil }
    }
    private var priceInvalid: Bool { !price.trimmingCharacters(in: .whitespaces).isEmpty && parsedPrice == nil }
    private var windowInvalid: Bool { scheduled && hasEnd && endsAt <= startsAt || !scheduled && hasEnd && endsAt <= Date() }
    private var liveNow: Bool { active && (!scheduled || startsAt <= Date()) && (!hasEnd || endsAt > Date()) }

    var body: some View {
        OwnerFormSheet(title: offer == nil ? L("Nouvelle offre", "New offer") : L("Modifier l'offre", "Edit offer"),
                       saveTitle: offer == nil ? L("Publier", "Publish") : L("Enregistrer", "Save"),
                       canSave: !title.trimmingCharacters(in: .whitespaces).isEmpty && !priceInvalid && !windowInvalid,
                       isSaving: saving, errorMessage: error, onSave: save) {
            Section(L("Photo", "Photo")) {
                OwnerPhotoField(bucket: "offer-images", scopeId: offerId, imageURL: $imageURL)
            }
            Section(L("Offre", "Offer")) {
                TextField(L("Titre (ex. 2 pour 1 sur les cafés)", "Title (e.g. 2-for-1 coffees)"), text: $title)
                TextField(L("Détails", "Details"), text: $details, axis: .vertical).lineLimit(2...5)
                TextField(L("Prix de l'offre (facultatif)", "Offer price (optional)"), text: $price).keyboardType(.decimalPad)
                if priceInvalid { Text(L("Saisissez un prix valide.", "Enter a valid price.")).font(.mv(size: 12)).foregroundStyle(OwnerTone.bad.color) }
            }
            Section {
                Toggle(L("Programmer le début", "Schedule the start"), isOn: $scheduled)
                if scheduled { DatePicker(L("Début", "Starts"), selection: $startsAt) }
                Toggle(L("Date de fin", "End date"), isOn: $hasEnd)
                if hasEnd { DatePicker(L("Fin", "Ends"), selection: $endsAt) }
                if windowInvalid { Text(L("La fin doit être après le début.", "The end must be after the start.")).font(.mv(size: 12)).foregroundStyle(OwnerTone.bad.color) }
                Toggle(L("Active", "Active"), isOn: $active)
            } header: { Text(L("Période", "Schedule")) }
            if offer == nil {
                Section {
                    Toggle(L("Notifier mes clients", "Notify my customers"), isOn: $notifyCustomers)
                } footer: {
                    Text(liveNow
                         ? L("Les clients qui ont activé les notifications reçoivent une alerte maintenant.", "Customers with notifications on get an alert now.")
                         : L("L'offre n'est pas active maintenant : aucune notification ne sera envoyée.", "The offer is not live right now: no notification will be sent."))
                }
            } else {
                Section {
                    Button(role: .destructive) { confirmDelete = true } label: { Label(L("Supprimer l'offre", "Delete offer"), systemImage: "trash") }
                }
            }
        }
        .confirmationDialog(L("Supprimer cette offre ?", "Delete this offer?"), isPresented: $confirmDelete, titleVisibility: .visible) {
            Button(L("Supprimer", "Delete"), role: .destructive) {
                Task { if await supabase.deleteOwnerOffer(offerId) { dismiss() } else { error = L("La suppression a échoué.", "Deleting failed.") } }
            }
            Button(L("Annuler", "Cancel"), role: .cancel) {}
        }
    }

    private func save() {
        saving = true; error = nil
        let start = scheduled ? startsAt : nil
        let end = hasEnd ? endsAt : nil
        Task {
            let ok: Bool
            if offer == nil {
                ok = await supabase.createOwnerOffer(id: offerId, title: title, description: details, price: parsedPrice, startsAt: start, endsAt: end, imageUrl: imageURL, active: active)
                if ok, notifyCustomers, liveNow { _ = await supabase.announceOwnerOffer(offerId) }
            } else {
                ok = await supabase.updateOwnerOffer(id: offerId, title: title, description: details, price: parsedPrice, startsAt: start, endsAt: end, imageUrl: imageURL, active: active)
            }
            saving = false
            if ok { dismiss() } else { error = L("L'offre n'a pas été enregistrée. Vérifiez les champs et réessayez.", "The offer was not saved. Check the fields and try again.") }
        }
    }
}

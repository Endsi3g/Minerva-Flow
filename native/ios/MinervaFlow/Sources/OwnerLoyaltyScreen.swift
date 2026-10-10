import SwiftUI

/// Fidélité: the daily counter flow first, then customers, rewards and reviews
/// as sections of one screen so nothing needs a second navigation level.
struct OwnerLoyaltyScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var section: Section = .counter
    @State private var respondingTo: NativeOwnerRestaurantReview?
    @State private var notingCustomer: NativeOwnerCustomer?
    private var L: Lx { Lx(storedLanguage) }

    enum Section: String, CaseIterable, Identifiable { case counter, customers, rewards, reviews; var id: String { rawValue } }

    private func title(_ s: Section) -> String {
        switch s {
        case .counter: return L("Comptoir", "Counter")
        case .customers: return L("Clients", "Customers")
        case .rewards: return L("Offres", "Offers")
        case .reviews: return L("Avis", "Reviews")
        }
    }
    private var pointsOutstanding: Int { supabase.ownerCustomers.reduce(0) { $0 + $1.loyaltyPoints } }

    var body: some View {
        NavigationStack {
            OwnerScreen(title: L("Fidélité", "Loyalty"), subtitle: supabase.selectedOwnerRestaurant?.name) {
                OwnerHeroCard(eyebrow: L("Clients inscrits", "Enrolled customers"), value: "\(supabase.ownerCustomers.count)",
                              caption: L("\(pointsOutstanding) points en circulation", "\(pointsOutstanding) points in circulation")) { EmptyView() }
                Picker("", selection: $section) {
                    ForEach(Section.allCases) { Text(title($0)).tag($0) }
                }.pickerStyle(.segmented)
                switch section {
                case .counter: OwnerCounterCard()
                case .customers: customers
                case .rewards: rewardsAndOffers
                case .reviews: reviews
                }
            }
            .sheet(item: $respondingTo) { ReviewReplyEditor(review: $0) }
            .sheet(item: $notingCustomer) { OwnerStaffNoteEditor(customer: $0) }
        }
    }

    private var customers: some View {
        OwnerCard(padding: 6) {
            if supabase.ownerCustomers.isEmpty {
                OwnerEmptyState(icon: "person.2", title: L("Aucun client pour l'instant", "No customers yet"),
                                message: L("Faites scanner votre QR de fidélité au comptoir pour inscrire vos premiers clients.", "Have guests scan your loyalty QR at the counter to enroll the first ones."))
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(supabase.ownerCustomers.enumerated()), id: \.element.id) { index, customer in
                        if index > 0 { OwnerDivider() }
                        Button { notingCustomer = customer } label: {
                            OwnerRow(icon: "person.fill", title: customer.name,
                                     subtitle: L("\(customer.loyaltyPoints) pts · \(customer.visitCount) visites · \(customer.totalSpent.cad)", "\(customer.loyaltyPoints) pts · \(customer.visitCount) visits · \(customer.totalSpent.cad)"), chevron: true)
                                .padding(.horizontal, 10).padding(.vertical, 4)
                        }.buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var rewardsAndOffers: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 10) {
                OwnerSectionHeader(title: L("Récompenses", "Rewards"))
                OwnerCard(padding: 6) {
                    if supabase.ownerRewards.isEmpty {
                        Text(L("Aucune récompense configurée. Créez-les depuis l'application web.", "No rewards yet. Create them from the web app.")).font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft).padding(14)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(supabase.ownerRewards.enumerated()), id: \.element.id) { index, reward in
                                if index > 0 { OwnerDivider() }
                                OwnerRow(icon: "gift.fill", title: reward.name, subtitle: reward.description) {
                                    OwnerPill(text: "\(reward.pointsCost) pts", tone: reward.active ? .good : .neutral)
                                }.padding(.horizontal, 10).padding(.vertical, 4)
                            }
                        }
                    }
                }
            }
            VStack(alignment: .leading, spacing: 10) {
                OwnerSectionHeader(title: L("Offres", "Offers"))
                OwnerCard(padding: 6) {
                    if supabase.ownerOffers.isEmpty {
                        Text(L("Aucune offre pour le moment.", "No offers yet.")).font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft).padding(14)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(supabase.ownerOffers.enumerated()), id: \.element.id) { index, offer in
                                if index > 0 { OwnerDivider() }
                                OwnerRow(icon: "tag.fill", title: offer.title, subtitle: offer.description) {
                                    OwnerPill(text: offer.active ? L("Active", "Live") : L("En pause", "Paused"), tone: offer.active ? .good : .neutral)
                                }.padding(.horizontal, 10).padding(.vertical, 4)
                            }
                        }
                    }
                }
            }
        }
    }

    private var reviews: some View {
        OwnerCard(padding: 6) {
            if supabase.ownerReviews.isEmpty {
                OwnerEmptyState(icon: "star.bubble", title: L("Aucun avis", "No reviews"), message: L("Les avis de vos clients apparaîtront ici.", "Your guests' reviews will appear here."))
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(supabase.ownerReviews.enumerated()), id: \.element.id) { index, review in
                        if index > 0 { OwnerDivider() }
                        Button { respondingTo = review } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(String(repeating: "★", count: review.rating) + String(repeating: "☆", count: max(0, 5 - review.rating)))
                                        .foregroundStyle(OwnerTone.warn.color)
                                    Spacer()
                                    OwnerPill(text: (review.ownerResponse ?? "").isEmpty ? L("À répondre", "Reply needed") : L("Répondu", "Replied"),
                                              tone: (review.ownerResponse ?? "").isEmpty ? .warn : .good)
                                }
                                if let comment = review.comment, !comment.isEmpty {
                                    Text(comment).font(.mv(size: 14)).foregroundStyle(MinervaColor.ink).multilineTextAlignment(.leading)
                                }
                            }
                            .padding(14).frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                        }.buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

/// Identify a guest by phone, confirm with their rotating card code, credit the visit.
struct OwnerCounterCard: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var phone = ""
    @State private var matches: [NativeOwnerCustomerLookup] = []
    @State private var selected: NativeOwnerCustomerLookup?
    @State private var confirmed: NativeCounterCustomer?
    @State private var code = ""
    @State private var amount = ""
    @State private var searching = false
    @State private var confirming = false
    @State private var saving = false
    @State private var didSearch = false
    @State private var success: String?
    private var L: Lx { Lx(storedLanguage) }
    private var parsedAmount: Double? {
        guard let value = Double(amount.replacingOccurrences(of: ",", with: ".")), value.isFinite, value > 0, value <= 100_000 else { return nil }
        return value
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            OwnerCard {
                VStack(alignment: .leading, spacing: 14) {
                    OwnerRow(icon: "phone.badge.checkmark", title: L("Créditer une visite", "Credit a visit"),
                             subtitle: L("Cherchez par téléphone. Le solde reste masqué tant que le client n'a pas donné son code.", "Search by phone. The balance stays hidden until the guest shares their code."), chevron: false)
                    HStack(spacing: 10) {
                        TextField(L("Numéro de téléphone", "Phone number"), text: $phone)
                            .keyboardType(.phonePad).textContentType(.telephoneNumber)
                            .padding(.horizontal, 14).frame(minHeight: 48)
                            .background(MinervaColor.cream, in: RoundedRectangle(cornerRadius: 14))
                        Button { search() } label: {
                            if searching { ProgressView().tint(.white) } else { Image(systemName: "magnifyingglass") }
                        }
                        .buttonStyle(OwnerPrimaryButtonStyle(compact: true))
                        .disabled(searching || phone.filter(\.isNumber).count < 7)
                        .accessibilityLabel(Text(L("Rechercher", "Search")))
                    }
                    if didSearch && matches.isEmpty && supabase.lastError == nil {
                        Label(L("Aucun client trouvé avec ce numéro.", "No customer found for that number."), systemImage: "person.crop.circle.badge.questionmark")
                            .font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft)
                    }
                    ForEach(matches) { match in
                        Button { select(match) } label: {
                            HStack {
                                OwnerRow(icon: "person.fill", title: match.name, subtitle: match.phone, chevron: false)
                                if selected?.id == match.id { Image(systemName: "checkmark.circle.fill").foregroundStyle(MinervaColor.emeraldDark) }
                            }
                        }.buttonStyle(.plain).disabled(confirming)
                    }
                }
            }

            if let selectedMatch = selected, confirmed == nil {
                OwnerCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(L("Demandez au client d'ouvrir sa carte et de vous lire le code à 6 chiffres.", "Ask the guest to open their card and read the 6-digit code."))
                            .font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                        HStack(spacing: 10) {
                            TextField("000000", text: $code).keyboardType(.numberPad).textContentType(.oneTimeCode).monospacedDigit()
                                .padding(.horizontal, 14).frame(minHeight: 48)
                                .background(MinervaColor.cream, in: RoundedRectangle(cornerRadius: 14))
                            Button { confirm(selectedMatch) } label: {
                                if confirming { ProgressView().tint(.white) } else { Text(L("Confirmer", "Confirm")) }
                            }
                            .buttonStyle(OwnerPrimaryButtonStyle(compact: true)).disabled(confirming || code.count != 6)
                        }
                    }
                }
            }

            if let customer = confirmed {
                OwnerCard {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            OwnerPill(text: L("Identité confirmée", "Identity confirmed"), tone: .good, icon: "checkmark.seal.fill")
                            Spacer()
                        }
                        Text(customer.name).font(MinervaFont.display(22, weight: .semibold))
                        Text(L("\(customer.loyaltyPoints) points · \(customer.visitCount) visites", "\(customer.loyaltyPoints) points · \(customer.visitCount) visits"))
                            .font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                        TextField(L("Montant de l'achat ($)", "Purchase amount ($)"), text: $amount).keyboardType(.decimalPad)
                            .padding(.horizontal, 14).frame(minHeight: 48)
                            .background(MinervaColor.cream, in: RoundedRectangle(cornerRadius: 14))
                        Button { record(customer) } label: {
                            if saving { ProgressView().tint(.white) } else { Label(L("Enregistrer la visite", "Record the visit"), systemImage: "plus.circle.fill") }
                        }
                        .buttonStyle(OwnerPrimaryButtonStyle()).disabled(saving || parsedAmount == nil)
                        if let success { OutcomeBanner(kind: .success, message: success) }
                    }
                }
            }
            if let error = supabase.lastError, didSearch || selected != nil {
                OutcomeBanner(kind: .failure, message: error)
            }
        }
    }

    private func reset() { selected = nil; confirmed = nil; code = ""; amount = ""; success = nil }

    private func search() {
        searching = true; didSearch = false; matches = []; reset()
        Task {
            matches = await supabase.lookupOwnerCustomersByPhone(phone)
            didSearch = true; searching = false
        }
    }

    private func select(_ match: NativeOwnerCustomerLookup) { selected = match; confirmed = nil; code = ""; amount = ""; success = nil }

    private func confirm(_ match: NativeOwnerCustomerLookup) {
        confirming = true
        Task {
            confirmed = await supabase.confirmOwnerCustomerIdentity(match, code: code)
            confirming = false
            if confirmed == nil { success = nil }
        }
    }

    private func record(_ customer: NativeCounterCustomer) {
        guard let value = parsedAmount else { return }
        saving = true; success = nil
        Task {
            if let updated = await supabase.recordOwnerCustomerVisit(customer: customer, amountSpent: value) {
                confirmed = NativeCounterCustomer(id: updated.id, name: updated.name, phone: updated.phone, loyaltyPoints: updated.loyaltyPoints, visitCount: updated.visitCount, totalSpent: updated.totalSpent)
                success = L("Visite enregistrée et points crédités.", "Visit recorded and points credited.")
                amount = ""
            }
            saving = false
        }
    }
}

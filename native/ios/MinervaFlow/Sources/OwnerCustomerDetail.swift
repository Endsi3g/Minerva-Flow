import SwiftUI

/// One customer's page for the owner (same information the web customer page
/// carries): totals, contact, favourite dishes, loyalty activity, recent
/// orders and the team's private note.
struct OwnerCustomerDetailScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let customer: NativeOwnerCustomer
    @State private var profile: OwnerCustomerProfile?
    @State private var failed = false
    @State private var note = ""
    @State private var editingNote = false
    private var L: Lx { Lx(storedLanguage) }

    var body: some View {
        OwnerScreen(title: customer.name, subtitle: nil, showsLocationMenu: false) {
            statsCard
            if profile != nil || failed { contactCard }
            if let favorites = profile?.favoriteItems, !favorites.isEmpty { favoritesCard(favorites) }
            noteCard
            if let profile {
                if !profile.loyalty.isEmpty { loyaltyCard(profile.loyalty) }
                if !profile.orders.isEmpty { ordersCard(profile.orders) }
            } else if failed {
                OwnerCard { OwnerEmptyState(icon: "wifi.exclamationmark", title: L("Historique indisponible", "History unavailable"),
                                            message: L("Vérifiez votre connexion, puis tirez pour actualiser.", "Check your connection, then pull to refresh.")) }
            } else {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 20)
            }
        }
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $editingNote, onDismiss: { Task { note = await supabase.fetchOwnerStaffNote(customerId: customer.id) } }) {
            OwnerStaffNoteEditor(customer: customer)
        }
    }

    private func load() async {
        profile = await supabase.fetchOwnerCustomerProfile(customerId: customer.id)
        failed = profile == nil
        note = await supabase.fetchOwnerStaffNote(customerId: customer.id)
    }

    private var statsCard: some View {
        let spent = profile?.totalSpent ?? customer.totalSpent
        let visits = profile?.visitCount ?? customer.visitCount
        let points = profile?.loyaltyPoints ?? customer.loyaltyPoints
        return OwnerCard(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 0) {
                    figure(L("Dépensé", "Spent"), spent.cad)
                    divider
                    figure(L("Visites", "Visits"), "\(visits)")
                    divider
                    figure(L("Points", "Points"), "\(points)")
                }
                HStack(spacing: 14) {
                    if visits > 0 { small(L("Panier moyen", "Avg. basket"), (spent / Double(visits)).cad) }
                    if let last = profile?.lastVisitAt?.ownerDate { small(L("Dernière visite", "Last visit"), last.ownerRelative(storedLanguage)) }
                    if let since = profile?.createdAt.ownerDate { small(L("Membre depuis", "Member since"), since.formatted(.dateTime.month(.abbreviated).year())) }
                }
            }
        }
    }

    private var divider: some View { Rectangle().fill(MinervaColor.border.opacity(0.8)).frame(width: 1, height: 40).padding(.horizontal, 10) }

    private func figure(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft)
            Text(value).font(MinervaFont.display(21, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1).minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private func small(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label).font(.mv(size: 11)).foregroundStyle(MinervaColor.inkFaint)
            Text(value).font(.mv(size: 12.5, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
        }
    }

    private var contactCard: some View {
        let phone = profile?.phone ?? customer.phone
        let email = profile?.email ?? customer.email
        return Group {
            if (phone?.isEmpty == false) || (email?.isEmpty == false) {
                OwnerCard(padding: 12) {
                    VStack(alignment: .leading, spacing: 10) {
                        if let phone, !phone.isEmpty {
                            HStack(spacing: 8) {
                                Label(phone, systemImage: "phone").font(.mv(size: 14))
                                Spacer()
                                let digits = phone.filter { $0.isNumber || $0 == "+" }
                                if let call = URL(string: "tel:" + digits) {
                                    Link(destination: call) { Label(L("Appeler", "Call"), systemImage: "phone.fill") }.buttonStyle(OwnerSecondaryButtonStyle(compact: true))
                                }
                                if let text = URL(string: "sms:" + digits) {
                                    Link(destination: text) { Label("SMS", systemImage: "message.fill") }.buttonStyle(OwnerSecondaryButtonStyle(compact: true))
                                }
                            }
                        }
                        if let email, !email.isEmpty {
                            HStack {
                                Label(email, systemImage: "envelope").font(.mv(size: 14)).lineLimit(1)
                                Spacer()
                                if let mail = URL(string: "mailto:" + email) {
                                    Link(destination: mail) { Text(L("Écrire", "Email")) }.buttonStyle(OwnerSecondaryButtonStyle(compact: true))
                                }
                            }
                        }
                        if let city = profile?.city, !city.isEmpty { Label(city, systemImage: "mappin.and.ellipse").font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft) }
                    }
                }
            }
        }
    }

    private func favoritesCard(_ items: [(name: String, quantity: Int)]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            OwnerSectionHeader(title: L("Ses plats préférés", "Favourite dishes"))
            OwnerCard(padding: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(items, id: \.name) { item in
                        HStack { Text(item.name).font(.mv(size: 14)); Spacer(); Text("×\(item.quantity)").font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft) }
                    }
                }
            }
        }
    }

    private var noteCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            OwnerSectionHeader(title: L("Note de l'équipe", "Team note"), actionTitle: note.isEmpty ? L("Ajouter", "Add") : L("Modifier", "Edit")) { editingNote = true }
            OwnerCard(padding: 12) {
                Text(note.isEmpty ? L("Allergies, préférences, table habituelle… visible par l'équipe seulement.", "Allergies, preferences, usual table… visible to your team only.") : note)
                    .font(.mv(size: 13.5)).foregroundStyle(note.isEmpty ? MinervaColor.inkFaint : MinervaColor.ink)
            }
        }
    }

    private func loyaltyCard(_ entries: [OwnerCustomerProfile.LoyaltyEntry]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            OwnerSectionHeader(title: L("Activité fidélité", "Loyalty activity"))
            OwnerCard(padding: 4) {
                VStack(spacing: 0) {
                    ForEach(Array(entries.prefix(10).enumerated()), id: \.element.id) { index, entry in
                        if index > 0 { OwnerDivider() }
                        OwnerRow(icon: entry.type == "echange" ? "gift.fill" : (entry.type == "ajustement" ? "slider.horizontal.3" : "heart.text.square.fill"),
                                 title: label(for: entry), subtitle: entry.createdAt.ownerDate?.ownerRelative(storedLanguage)) {
                            Text((entry.pointsDelta >= 0 ? "+" : "") + "\(entry.pointsDelta) pts").font(.mv(size: 13, weight: .semibold))
                                .foregroundStyle(entry.pointsDelta >= 0 ? OwnerTone.good.color : OwnerTone.bad.color)
                        }
                        .padding(.horizontal, 10).padding(.vertical, 3)
                    }
                }
            }
        }
    }

    private func label(for entry: OwnerCustomerProfile.LoyaltyEntry) -> String {
        switch entry.type {
        case "echange": return L("Récompense échangée", "Reward redeemed")
        case "ajustement": return entry.note?.isEmpty == false ? entry.note! : L("Ajustement", "Adjustment")
        default: return entry.amountSpent.map { L("Visite · ", "Visit · ") + $0.cad } ?? L("Visite", "Visit")
        }
    }

    private func ordersCard(_ orders: [OwnerCustomerProfile.OrderEntry]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            OwnerSectionHeader(title: L("Commandes récentes", "Recent orders"))
            OwnerCard(padding: 4) {
                VStack(spacing: 0) {
                    ForEach(Array(orders.prefix(8).enumerated()), id: \.element.id) { index, order in
                        if index > 0 { OwnerDivider() }
                        OwnerRow(icon: "bag.fill", title: order.items.prefix(2).map { "\($0.quantity)× \($0.itemName)" }.joined(separator: ", "),
                                 subtitle: (order.createdAt.ownerDate?.ownerRelative(storedLanguage) ?? "") + " · " + OwnerOrderFlow.label(order.status, L)) {
                            Text(order.total.cad).font(.mv(size: 13, weight: .semibold))
                        }
                        .padding(.horizontal, 10).padding(.vertical, 3)
                    }
                }
            }
        }
    }
}

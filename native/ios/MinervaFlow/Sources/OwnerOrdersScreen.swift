import SwiftUI

/// Order lifecycle shared by the list and the detail sheet.
enum OwnerOrderFlow {
    static func next(_ status: String) -> (status: String, fr: String, en: String)? {
        switch status {
        case "soumise": return ("confirmee", "Accepter", "Accept")
        case "confirmee": return ("en_preparation", "Lancer la préparation", "Start preparing")
        case "en_preparation": return ("prete", "Marquer prête", "Mark ready")
        case "prete": return ("servie", "Marquer servie", "Mark served")
        default: return nil
        }
    }

    static func label(_ status: String, _ L: Lx) -> String {
        switch status {
        case "soumise": return L("Nouvelle", "New")
        case "confirmee": return L("Acceptée", "Accepted")
        case "en_preparation": return L("En préparation", "Preparing")
        case "prete": return L("Prête", "Ready")
        case "servie": return L("Servie", "Served")
        case "annulee": return L("Annulée", "Cancelled")
        default: return status.capitalized
        }
    }

    static func tone(_ status: String) -> OwnerTone {
        switch status {
        case "soumise": return .warn
        case "confirmee", "en_preparation": return .info
        case "prete", "servie": return .good
        case "annulee": return .bad
        default: return .neutral
        }
    }
}

struct OwnerOrdersScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var filter: Filter = .attention
    @State private var selected: NativeOwnerOrder?
    @State private var banner: (ok: Bool, text: String)?
    @State private var busyOrderId: String?
    @State private var refusing: NativeOwnerOrder?

    private var L: Lx { Lx(storedLanguage) }

    enum Filter: String, CaseIterable, Identifiable {
        case attention, active, done, all
        var id: String { rawValue }
    }

    private func matches(_ order: NativeOwnerOrder, _ filter: Filter) -> Bool {
        switch filter {
        case .attention: return order.status == "soumise"
        case .active: return ["confirmee", "en_preparation", "prete"].contains(order.status)
        case .done: return ["servie", "annulee"].contains(order.status)
        case .all: return true
        }
    }

    private func title(_ filter: Filter) -> String {
        switch filter {
        case .attention: return L("À traiter", "To handle")
        case .active: return L("En cours", "In progress")
        case .done: return L("Terminées", "Done")
        case .all: return L("Toutes", "All")
        }
    }

    private var visible: [NativeOwnerOrder] { supabase.ownerOrders.filter { matches($0, filter) } }

    var body: some View {
        NavigationStack {
            OwnerScreen(title: L("Commandes", "Orders"),
                        subtitle: supabase.selectedOwnerRestaurant?.name) {
                if let banner {
                    OutcomeBanner(kind: banner.ok ? .success : .failure, message: banner.text)
                        .transition(.opacity)
                }
                Picker("", selection: $filter) {
                    ForEach(Filter.allCases) { value in
                        let count = supabase.ownerOrders.filter { matches($0, value) }.count
                        Text(value == .all || count == 0 ? title(value) : "\(title(value)) · \(count)").tag(value)
                    }
                }
                .pickerStyle(.segmented)

                if supabase.isLoadingOwnerOperations && supabase.ownerOrders.isEmpty {
                    Skeletons.list(count: 3)
                } else if visible.isEmpty {
                    OwnerCard {
                        OwnerEmptyState(
                            icon: filter == .attention ? "checkmark.circle" : "tray",
                            title: filter == .attention ? L("Rien à traiter", "Nothing to handle") : L("Aucune commande", "No orders"),
                            message: filter == .attention
                                ? L("Les nouvelles commandes apparaissent ici dès qu'un client les envoie.", "New orders appear here as soon as a customer sends one.")
                                : L("Les commandes de cette catégorie apparaîtront ici.", "Orders in this category will appear here."))
                    }
                } else {
                    VStack(spacing: 12) {
                        ForEach(visible) { order in orderCard(order) }
                    }
                }
            }
            .sheet(item: $selected) { order in OwnerOrderDetailSheet(orderId: order.id) }
            .confirmationDialog(L("Refuser cette commande ?", "Decline this order?"), isPresented: Binding(get: { refusing != nil }, set: { if !$0 { refusing = nil } }), titleVisibility: .visible) {
                Button(L("Refuser la commande", "Decline order"), role: .destructive) {
                    if let order = refusing { advance(order, to: "annulee") }
                    refusing = nil
                }
                Button(L("Retour", "Back"), role: .cancel) { refusing = nil }
            } message: {
                Text(L("Le client sera averti que sa commande ne peut pas être préparée.", "The customer will be told the order cannot be prepared."))
            }
        }
    }

    private func orderCard(_ order: NativeOwnerOrder) -> some View {
        let next = OwnerOrderFlow.next(order.status)
        return OwnerCard {
            VStack(alignment: .leading, spacing: 12) {
                Button { selected = order } label: {
                    HStack(alignment: .top, spacing: 12) {
                        OwnerIconTile(icon: iconName(order), tint: OwnerOrderFlow.tone(order.status).color, size: 42)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(order.guestName).font(.mv(size: 16, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                            Text(timeLine(order)).font(.mv(size: 12.5)).foregroundStyle(MinervaColor.inkSoft)
                            OwnerPill(text: OwnerOrderFlow.label(order.status, L), tone: OwnerOrderFlow.tone(order.status))
                                .padding(.top, 2)
                        }
                        Spacer(minLength: 8)
                        VStack(alignment: .trailing, spacing: 6) {
                            Text(order.total.cad).font(.mv(size: 16, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                            Image(systemName: "chevron.right").font(.mv(size: 12, weight: .semibold)).foregroundStyle(MinervaColor.inkFaint)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if let next {
                    HStack(spacing: 10) {
                        Button { advance(order, to: next.status) } label: {
                            if busyOrderId == order.id { ProgressView().tint(.white) } else { Text(L(next.fr, next.en)) }
                        }
                        .buttonStyle(OwnerPrimaryButtonStyle(compact: true))
                        .disabled(busyOrderId != nil)
                        if order.status == "soumise" {
                            Button(L("Refuser", "Decline")) { refusing = order }
                                .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.bad.color, compact: true))
                                .disabled(busyOrderId != nil)
                        }
                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }

    private func iconName(_ order: NativeOwnerOrder) -> String {
        switch order.status {
        case "soumise": return "bell.badge.fill"
        case "prete", "servie": return "checkmark.circle.fill"
        case "annulee": return "xmark.circle.fill"
        default: return "flame.fill"
        }
    }

    private func timeLine(_ order: NativeOwnerOrder) -> String {
        if let ready = order.estimatedReadyAt?.ownerDate {
            return L("Prête vers ", "Ready around ") + ready.formatted(date: .omitted, time: .shortened)
        }
        if let pickup = order.requestedReadyAt?.ownerDate {
            return L("Ramassage ", "Pickup ") + pickup.formatted(date: .abbreviated, time: .shortened)
        }
        return (order.createdAt.ownerDate ?? Date()).ownerRelative(storedLanguage)
    }

    private func advance(_ order: NativeOwnerOrder, to status: String) {
        busyOrderId = order.id
        Task {
            let ok = await supabase.updateOwnerOrderStatus(order.id, restaurantId: order.restaurantId, status: status)
            busyOrderId = nil
            withAnimation {
                banner = (ok, ok
                    ? L("Commande mise à jour. Le client est averti.", "Order updated. The customer has been notified.")
                    : L("La commande n'a pas pu être mise à jour. Réessayez.", "The order could not be updated. Try again."))
            }
            try? await Task.sleep(for: .seconds(4))
            withAnimation { banner = nil }
        }
    }
}

struct OwnerOrderDetailSheet: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let orderId: String
    @State private var detail: NativeOwnerOrderDetail?
    @State private var loadFailed = false
    @State private var busy = false
    @State private var message: (ok: Bool, text: String)?
    private var L: Lx { Lx(storedLanguage) }
    private var order: NativeOwnerOrder? { supabase.ownerOrders.first { $0.id == orderId } }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let order {
                    VStack(alignment: .leading, spacing: 16) {
                        header(order)
                        if let message { OutcomeBanner(kind: message.ok ? .success : .failure, message: message.text) }
                        actions(order)
                        itemsCard
                        contactCard
                        etaCard(order)
                    }
                    .padding(20)
                } else {
                    OwnerEmptyState(icon: "tray", title: L("Commande introuvable", "Order not found"), message: L("Elle a peut-être été supprimée.", "It may have been removed."))
                }
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle(L("Commande", "Order"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(L("Fermer", "Close")) { dismiss() } } }
            .task { detail = await supabase.fetchOwnerOrderDetail(orderId); loadFailed = detail == nil }
        }
        .tint(MinervaColor.emeraldDark)
        .presentationDetents([.large])
    }

    private func header(_ order: NativeOwnerOrder) -> some View {
        OwnerHeroCard(eyebrow: order.guestName, value: order.total.cad,
                      caption: (order.createdAt.ownerDate ?? Date()).formatted(date: .abbreviated, time: .shortened)) {
            HStack(spacing: 8) {
                OwnerPill(text: OwnerOrderFlow.label(order.status, L), tone: .neutral)
                    .colorScheme(.dark)
                if let payment = detail?.paymentStatus {
                    OwnerPill(text: paymentLabel(payment), tone: .neutral).colorScheme(.dark)
                }
            }
        }
    }

    private func paymentLabel(_ status: String) -> String {
        switch status {
        case "paye", "payee": return L("Payée", "Paid")
        case "en_attente": return L("Paiement en attente", "Payment pending")
        case "non_requis": return L("Paiement au comptoir", "Pay at counter")
        default: return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    private func actions(_ order: NativeOwnerOrder) -> some View {
        VStack(spacing: 10) {
            if let next = OwnerOrderFlow.next(order.status) {
                Button { run { await supabase.updateOwnerOrderStatus(order.id, restaurantId: order.restaurantId, status: next.status) } } label: {
                    if busy { ProgressView().tint(.white) } else { Text(L(next.fr, next.en)) }
                }
                .buttonStyle(OwnerPrimaryButtonStyle()).disabled(busy)
            }
            HStack(spacing: 10) {
                Button { run { await supabase.notifyOwnerOrder(order.id, restaurantId: order.restaurantId) } } label: {
                    Label(L("Avertir le client", "Notify customer"), systemImage: "bell")
                }
                .buttonStyle(OwnerSecondaryButtonStyle()).disabled(busy)
                if !["servie", "annulee"].contains(order.status) {
                    Button(role: .destructive) { run { await supabase.updateOwnerOrderStatus(order.id, restaurantId: order.restaurantId, status: "annulee") } } label: {
                        Label(L("Refuser", "Decline"), systemImage: "xmark")
                    }
                    .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.bad.color)).disabled(busy)
                }
            }
        }
    }

    private var itemsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: L("Articles", "Items"))
            OwnerCard {
                if let detail {
                    if detail.items.isEmpty {
                        Text(L("Aucun détail d'article pour cette commande.", "No item detail for this order.")).font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                    } else {
                        VStack(spacing: 10) {
                            ForEach(detail.items) { line in
                                HStack(alignment: .top) {
                                    Text("\(line.quantity)×").font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark).frame(width: 34, alignment: .leading)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(line.itemName).font(.mv(size: 15, weight: .medium))
                                        if let note = line.notes, !note.isEmpty { Text(note).font(.mv(size: 12.5)).foregroundStyle(MinervaColor.inkSoft) }
                                    }
                                    Spacer()
                                    Text((line.unitPrice * Double(line.quantity)).cad).font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                                }
                            }
                            Divider()
                            totalLine(L("Sous-total", "Subtotal"), detail.subtotal)
                            if detail.taxAmount > 0 { totalLine(L("Taxes", "Taxes"), detail.taxAmount) }
                            if detail.tipAmount > 0 { totalLine(L("Pourboire", "Tip"), detail.tipAmount) }
                            totalLine(L("Total", "Total"), detail.total, bold: true)
                        }
                    }
                } else if loadFailed {
                    Text(L("Les détails n'ont pas pu être chargés.", "Details could not be loaded.")).font(.mv(size: 14)).foregroundStyle(OwnerTone.bad.color)
                } else {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
        }
    }

    private func totalLine(_ label: String, _ value: Double, bold: Bool = false) -> some View {
        HStack {
            Text(label).font(.mv(size: 14, weight: bold ? .semibold : .regular))
            Spacer()
            Text(value.cad).font(.mv(size: 14, weight: bold ? .semibold : .regular))
        }
    }

    @ViewBuilder private var contactCard: some View {
        if let detail, (detail.guestPhone?.isEmpty == false) || (detail.notes?.isEmpty == false) || (detail.deliveryAddress?.isEmpty == false) {
            VStack(alignment: .leading, spacing: 10) {
                OwnerSectionHeader(title: L("Client", "Customer"))
                OwnerCard {
                    VStack(alignment: .leading, spacing: 12) {
                        if let phone = detail.guestPhone, !phone.isEmpty {
                            HStack(spacing: 10) {
                                Label(phone, systemImage: "phone").font(.mv(size: 15))
                                Spacer()
                                if let call = URL(string: "tel:" + phone.filter { $0.isNumber || $0 == "+" }) {
                                    Link(L("Appeler", "Call"), destination: call).font(.mv(size: 14, weight: .semibold))
                                }
                                if let text = URL(string: "sms:" + phone.filter { $0.isNumber || $0 == "+" }) {
                                    Link("SMS", destination: text).font(.mv(size: 14, weight: .semibold))
                                }
                            }
                        }
                        if let address = detail.deliveryAddress, !address.isEmpty {
                            Label(address, systemImage: "mappin.and.ellipse").font(.mv(size: 14))
                        }
                        if let note = detail.notes, !note.isEmpty {
                            Label(note, systemImage: "text.bubble").font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                        }
                    }
                }
            }
        }
    }

    private func etaCard(_ order: NativeOwnerOrder) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: L("Délai de préparation", "Preparation time"))
            OwnerCard {
                VStack(alignment: .leading, spacing: 12) {
                    if let ready = order.estimatedReadyAt?.ownerDate {
                        Label(L("Prête vers ", "Ready around ") + ready.formatted(date: .omitted, time: .shortened), systemImage: "clock")
                            .font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark)
                    }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach([10, 15, 30, 45, 60], id: \.self) { minutes in
                                Button("\(minutes) min") { run { await supabase.updateOwnerOrderETA(order.id, restaurantId: order.restaurantId, minutesFromNow: minutes) } }
                                    .buttonStyle(OwnerSecondaryButtonStyle(compact: true)).disabled(busy)
                            }
                            if order.estimatedReadyAt != nil {
                                Button(L("Effacer", "Clear")) { run { await supabase.updateOwnerOrderETA(order.id, restaurantId: order.restaurantId, minutesFromNow: nil) } }
                                    .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.neutral.color, compact: true)).disabled(busy)
                            }
                        }
                    }
                }
            }
        }
    }

    private func run(_ work: @escaping () async -> Bool) {
        busy = true
        Task {
            let ok = await work()
            busy = false
            message = (ok, ok ? L("Fait.", "Done.") : L("L'action a échoué. Réessayez.", "The action failed. Try again."))
        }
    }
}

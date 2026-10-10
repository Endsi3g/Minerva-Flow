import SwiftUI
import UserNotifications

/// Order lifecycle shared by the list and the detail sheet.
enum OwnerOrderFlow {
    static func next(_ status: String) -> (status: String, fr: String, en: String)? {
        switch status {
        case "soumise": return ("confirmee", "Accepter", "Accept")
        case "confirmee": return ("en_preparation", "Lancer la préparation", "Start preparing")
        // Ready and "tell the customer" are one gesture: the status route
        // notifies the customer's phone as part of the change.
        case "en_preparation": return ("prete", "Prête — avertir le client", "Ready — notify customer")
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
    @ObservedObject private var notifications = NotificationManager.shared
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var filter: Filter = .new
    @State private var selected: NativeOwnerOrder?
    @State private var banner: (ok: Bool, text: String)?
    @State private var busyOrderId: String?
    @State private var refusing: NativeOwnerOrder?

    private var L: Lx { Lx(storedLanguage) }

    /// New → accepted → being prepared (preparing or ready) → done.
    enum Filter: String, CaseIterable, Identifiable {
        case new, accepted, preparing, done, all
        var id: String { rawValue }
    }

    private func matches(_ order: NativeOwnerOrder, _ filter: Filter) -> Bool {
        switch filter {
        case .new: return order.status == "soumise"
        case .accepted: return order.status == "confirmee"
        case .preparing: return ["en_preparation", "prete"].contains(order.status)
        case .done: return ["servie", "annulee"].contains(order.status)
        case .all: return true
        }
    }

    private func title(_ filter: Filter) -> String {
        switch filter {
        case .new: return L("Nouvelles", "New")
        case .accepted: return L("Acceptées", "Accepted")
        case .preparing: return L("En préparation", "Preparing")
        case .done: return L("Terminées", "Done")
        case .all: return L("Toutes", "All")
        }
    }

    private var visible: [NativeOwnerOrder] { supabase.ownerOrders.filter { matches($0, filter) } }

    var body: some View {
        NavigationStack {
            OwnerScreen(title: L("Commandes", "Orders"),
                        subtitle: supabase.selectedOwnerRestaurant?.name) {
                OwnerOrderAlertsBanner(L: L)
                if let banner {
                    OutcomeBanner(kind: banner.ok ? .success : .failure, message: banner.text)
                        .transition(.opacity)
                }
                filterChips

                if supabase.isLoadingOwnerOperations && supabase.ownerOrders.isEmpty {
                    Skeletons.list(count: 3)
                } else if visible.isEmpty {
                    OwnerCard {
                        OwnerEmptyState(
                            icon: filter == .new ? "checkmark.circle" : "tray",
                            title: filter == .new ? L("Rien à traiter", "Nothing to handle") : L("Aucune commande", "No orders"),
                            message: filter == .new
                                ? L("Les nouvelles commandes apparaissent ici dès qu'un client les envoie.", "New orders appear here as soon as a customer sends one.")
                                : L("Les commandes de cette catégorie apparaîtront ici.", "Orders in this category will appear here."))
                    }
                } else {
                    VStack(spacing: 10) {
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
            .task { await notifications.refreshStatus() }
        }
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Filter.allCases) { value in
                    let count = value == .all ? 0 : supabase.ownerOrders.filter { matches($0, value) }.count
                    let active = value == filter
                    Button { withAnimation(.easeOut(duration: 0.15)) { filter = value } } label: {
                        HStack(spacing: 5) {
                            Text(title(value)).font(.mv(size: 13, weight: .semibold))
                            if count > 0 {
                                Text("\(count)").font(.mv(size: 11, weight: .bold))
                                    .padding(.horizontal, 6).padding(.vertical, 1)
                                    .background(active ? Color.white.opacity(0.25) : OwnerTone.good.color.opacity(0.14), in: Capsule())
                            }
                        }
                        .foregroundStyle(active ? .white : MinervaColor.inkSoft)
                        .padding(.horizontal, 12).frame(minHeight: 32)
                        .background(active ? MinervaColor.emeraldDark : MinervaColor.creamSoft, in: Capsule())
                        .overlay(Capsule().stroke(MinervaColor.border.opacity(active ? 0 : 0.8), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(active ? .isSelected : [])
                }
            }
        }
    }

    private func orderCard(_ order: NativeOwnerOrder) -> some View {
        let next = OwnerOrderFlow.next(order.status)
        return OwnerCard(padding: 12) {
            VStack(alignment: .leading, spacing: 10) {
                Button { selected = order } label: {
                    HStack(alignment: .center, spacing: 10) {
                        OwnerIconTile(icon: iconName(order), tint: OwnerOrderFlow.tone(order.status).color, size: 34)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(order.guestName).font(.mv(size: 15, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                            HStack(spacing: 6) {
                                Text(timeLine(order)).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft).lineLimit(1)
                                // A new order is obviously new: the tab and filter already say so.
                                if order.status != "soumise" {
                                    OwnerPill(text: OwnerOrderFlow.label(order.status, L), tone: OwnerOrderFlow.tone(order.status))
                                }
                            }
                        }
                        Spacer(minLength: 6)
                        HStack(spacing: 5) {
                            Text(order.total.cad).font(.mv(size: 15, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                            Image(systemName: "chevron.right").font(.mv(size: 11, weight: .semibold)).foregroundStyle(MinervaColor.inkFaint)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if let next {
                    HStack(spacing: 8) {
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
                    ? L("Commande mise à jour. ", "Order updated. ") + customerNoticeText(supabase.lastCustomerNotifyChannels)
                    : L("La commande n'a pas pu être mise à jour. Réessayez.", "The order could not be updated. Try again."))
            }
            try? await Task.sleep(for: .seconds(4))
            withAnimation { banner = nil }
        }
    }
}

/// Reminder shown while this phone cannot ring for a new order: without the
/// permission, a new order only shows when the app is already open.
struct OwnerOrderAlertsBanner: View {
    @ObservedObject private var notifications = NotificationManager.shared
    @Environment(\.openURL) private var openURL
    let L: Lx

    var body: some View {
        switch notifications.authorizationStatus {
        case .notDetermined:
            bar(L("Activez le son pour les nouvelles commandes", "Turn on sound for new orders"), L("Activer", "Turn on")) {
                Task { _ = await notifications.requestPermission() }
            }
        case .denied:
            bar(L("Les alertes de commande sont désactivées", "Order alerts are turned off"), L("Réglages", "Settings")) {
                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
            }
        default:
            EmptyView()
        }
    }

    private func bar(_ text: String, _ action: String, perform: @escaping () -> Void) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "bell.badge.fill").font(.mv(size: 14, weight: .semibold)).foregroundStyle(OwnerTone.warn.color)
            Text(text).font(.mv(size: 12.5, weight: .medium)).foregroundStyle(MinervaColor.ink).lineLimit(2)
            Spacer(minLength: 4)
            Button(action: perform) { Text(action) }.buttonStyle(OwnerPrimaryButtonStyle(compact: true))
        }
        .padding(10)
        .background(OwnerTone.warn.color.opacity(0.10), in: RoundedRectangle(cornerRadius: 14))
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
    @State private var draft = ""
    @State private var sentNote: String?
    @FocusState private var noteFocused: Bool
    private var L: Lx { Lx(storedLanguage) }
    private var order: NativeOwnerOrder? { supabase.ownerOrders.first { $0.id == orderId } }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let order {
                    VStack(alignment: .leading, spacing: 14) {
                        header(order)
                        if let message { OutcomeBanner(kind: message.ok ? .success : .failure, message: message.text) }
                        customerCard
                        if !["servie", "annulee"].contains(order.status) {
                            etaCard(order)
                            messageCard(order)
                        }
                        itemsCard
                    }
                    .padding(16)
                } else {
                    OwnerEmptyState(icon: "tray", title: L("Commande introuvable", "Order not found"), message: L("Elle a peut-être été supprimée.", "It may have been removed."))
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle(L("Commande", "Order"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(L("Fermer", "Close")) { dismiss() } } }
            .safeAreaInset(edge: .bottom) { if let order { actionBar(order) } }
            .task {
                detail = await supabase.fetchOwnerOrderDetail(orderId)
                loadFailed = detail == nil
                sentNote = detail?.ownerMessage
            }
        }
        .tint(MinervaColor.emeraldDark)
        .presentationDetents([.large])
    }

    // MARK: Header

    private func header(_ order: NativeOwnerOrder) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(order.guestName).font(MinervaFont.display(22, weight: .semibold)).foregroundStyle(.white).lineLimit(1)
                Spacer(minLength: 8)
                Text(order.total.cad).font(MinervaFont.display(22, weight: .semibold)).foregroundStyle(.white)
            }
            HStack(spacing: 6) {
                Text((order.createdAt.ownerDate ?? Date()).formatted(date: .abbreviated, time: .shortened))
                    .font(.mv(size: 12)).foregroundStyle(.white.opacity(0.78))
                Spacer(minLength: 4)
                if order.status != "soumise" { OwnerPill(text: OwnerOrderFlow.label(order.status, L), tone: .neutral).colorScheme(.dark) }
                if let payment = detail?.paymentStatus {
                    OwnerPill(text: paymentLabel(payment), tone: .neutral).colorScheme(.dark)
                }
            }
        }
        .padding(14)
        .background(MinervaColor.emeraldDeep, in: RoundedRectangle(cornerRadius: 18))
    }

    private func paymentLabel(_ status: String) -> String {
        switch status {
        case "paye", "payee": return L("Payée", "Paid")
        case "en_attente": return L("Paiement en attente", "Payment pending")
        case "non_requis": return L("Au comptoir", "At counter")
        default: return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    // MARK: Customer, directly under the header

    @ViewBuilder private var customerCard: some View {
        if let detail, (detail.guestPhone?.isEmpty == false) || (detail.notes?.isEmpty == false) || (detail.deliveryAddress?.isEmpty == false) {
            OwnerCard(padding: 12) {
                VStack(alignment: .leading, spacing: 10) {
                    if let phone = detail.guestPhone, !phone.isEmpty {
                        HStack(spacing: 8) {
                            Label(phone, systemImage: "phone").font(.mv(size: 14))
                            Spacer()
                            let digits = phone.filter { $0.isNumber || $0 == "+" }
                            if let call = URL(string: "tel:" + digits) {
                                Link(destination: call) { Label(L("Appeler", "Call"), systemImage: "phone.fill") }
                                    .buttonStyle(OwnerSecondaryButtonStyle(compact: true))
                            }
                            if let text = URL(string: "sms:" + digits) {
                                Link(destination: text) { Label("SMS", systemImage: "message.fill") }
                                    .buttonStyle(OwnerSecondaryButtonStyle(compact: true))
                            }
                        }
                    }
                    if let address = detail.deliveryAddress, !address.isEmpty {
                        Label(address, systemImage: "mappin.and.ellipse").font(.mv(size: 13))
                    }
                    if let note = detail.notes, !note.isEmpty {
                        Label(note, systemImage: "text.bubble").font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft)
                    }
                }
            }
        }
    }

    // MARK: Preparation time

    private func etaCard(_ order: NativeOwnerOrder) -> some View {
        OwnerCard(padding: 12) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(L("Délai de préparation", "Preparation time")).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft)
                    Spacer()
                    if let ready = order.estimatedReadyAt?.ownerDate {
                        Label(ready.formatted(date: .omitted, time: .shortened), systemImage: "clock")
                            .font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark)
                    }
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach([10, 15, 20, 30, 45, 60], id: \.self) { minutes in
                            Button("\(minutes) min") { run { await supabase.updateOwnerOrderETA(order.id, restaurantId: order.restaurantId, minutesFromNow: minutes) } }
                                .buttonStyle(OwnerSecondaryButtonStyle(compact: true)).disabled(busy)
                        }
                        if order.estimatedReadyAt != nil {
                            Button(L("Effacer", "Clear")) { run(notifies: false) { await supabase.updateOwnerOrderETA(order.id, restaurantId: order.restaurantId, minutesFromNow: nil) } }
                                .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.neutral.color, compact: true)).disabled(busy)
                        }
                    }
                }
                Text(L("Le client est prévenu sur son téléphone, puis à nouveau quand le délai est écoulé.", "The customer is told on their phone, and again when the time is up."))
                    .font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkFaint)
            }
        }
    }

    // MARK: Message to the customer

    private var quickPhrases: [String] {
        [L("Prête dans 10 minutes", "Ready in 10 minutes"),
         L("Petit retard, merci de votre patience", "Slight delay, thanks for your patience"),
         L("Beaucoup de monde ce soir", "Busy tonight"),
         L("Presque prête !", "Almost ready!")]
    }

    private func messageCard(_ order: NativeOwnerOrder) -> some View {
        OwnerCard(padding: 12) {
            VStack(alignment: .leading, spacing: 8) {
                Text(L("Message au client", "Message to the customer")).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(quickPhrases, id: \.self) { phrase in
                            Button(phrase) { draft = phrase }
                                .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.neutral.color, compact: true))
                        }
                    }
                }
                HStack(spacing: 8) {
                    TextField(L("Écrire un message…", "Write a message…"), text: $draft, axis: .vertical)
                        .lineLimit(1...3)
                        .font(.mv(size: 14))
                        .focused($noteFocused)
                        .padding(.horizontal, 10).padding(.vertical, 8)
                        .background(MinervaColor.cream, in: RoundedRectangle(cornerRadius: 12))
                        .onChange(of: draft) { _, new in if new.count > 240 { draft = String(new.prefix(240)) } }
                    Button {
                        noteFocused = false
                        let text = draft
                        run {
                            let ok = await supabase.sendOwnerOrderMessage(order.id, restaurantId: order.restaurantId, message: text)
                            if ok { sentNote = text.trimmingCharacters(in: .whitespacesAndNewlines); draft = "" }
                            return ok
                        }
                    } label: { Image(systemName: "paperplane.fill").font(.mv(size: 14, weight: .semibold)) }
                    .buttonStyle(OwnerPrimaryButtonStyle(compact: true))
                    .disabled(busy || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .accessibilityLabel(Text(L("Envoyer", "Send")))
                }
                if let sentNote, !sentNote.isEmpty {
                    Label(L("Dernier message : ", "Last message: ") + sentNote, systemImage: "checkmark.bubble")
                        .font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft).lineLimit(2)
                }
            }
        }
    }

    // MARK: Items

    private var itemsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            OwnerSectionHeader(title: L("Articles", "Items"))
            OwnerCard(padding: 12) {
                if let detail {
                    if detail.items.isEmpty {
                        Text(L("Aucun détail d'article pour cette commande.", "No item detail for this order.")).font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft)
                    } else {
                        VStack(spacing: 8) {
                            ForEach(detail.items) { line in
                                HStack(alignment: .top) {
                                    Text("\(line.quantity)×").font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark).frame(width: 30, alignment: .leading)
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(line.itemName).font(.mv(size: 14, weight: .medium))
                                        if let note = line.notes, !note.isEmpty { Text(note).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft) }
                                    }
                                    Spacer()
                                    Text((line.unitPrice * Double(line.quantity)).cad).font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft)
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
                    Text(L("Les détails n'ont pas pu être chargés.", "Details could not be loaded.")).font(.mv(size: 13)).foregroundStyle(OwnerTone.bad.color)
                } else {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
        }
    }

    private func totalLine(_ label: String, _ value: Double, bold: Bool = false) -> some View {
        HStack {
            Text(label).font(.mv(size: 13, weight: bold ? .semibold : .regular))
            Spacer()
            Text(value.cad).font(.mv(size: 13, weight: bold ? .semibold : .regular))
        }
    }

    // MARK: Sticky action bar

    @ViewBuilder private func actionBar(_ order: NativeOwnerOrder) -> some View {
        let finished = ["servie", "annulee"].contains(order.status)
        if !finished {
            HStack(spacing: 8) {
                if order.status == "soumise" {
                    Button(role: .destructive) { run { await supabase.updateOwnerOrderStatus(order.id, restaurantId: order.restaurantId, status: "annulee") } } label: {
                        Text(L("Refuser", "Decline"))
                    }
                    .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.bad.color, compact: true)).disabled(busy)
                }
                if order.status == "prete" {
                    Button { run { await supabase.notifyOwnerOrder(order.id, restaurantId: order.restaurantId) } } label: {
                        Label(L("Renvoyer", "Resend"), systemImage: "bell")
                    }
                    .buttonStyle(OwnerSecondaryButtonStyle(compact: true)).disabled(busy)
                }
                if let next = OwnerOrderFlow.next(order.status) {
                    Button { run { await supabase.updateOwnerOrderStatus(order.id, restaurantId: order.restaurantId, status: next.status) } } label: {
                        if busy { ProgressView().tint(.white) } else { Text(L(next.fr, next.en)) }
                    }
                    .buttonStyle(OwnerPrimaryButtonStyle()).disabled(busy)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(.ultraThinMaterial)
        }
    }

    private func run(notifies: Bool = true, _ work: @escaping () async -> Bool) {
        busy = true
        Task {
            let ok = await work()
            busy = false
            let notice = notifies ? customerNoticeText(supabase.lastCustomerNotifyChannels) : ""
            message = (ok, ok ? L("Fait. ", "Done. ") + notice : L("L'action a échoué. Réessayez.", "The action failed. Try again."))
        }
    }
}

extension View {
    /// Honest delivery receipt for the owner: says which channel actually
    /// reached the customer instead of always claiming success.
    func customerNoticeText(_ channels: [String], language: String = UserDefaults.standard.string(forKey: AppLanguagePreference.key) ?? "fr") -> String {
        let L = Lx(language)
        if channels.contains("push") {
            return channels.contains("email")
                ? L("Client prévenu sur son téléphone et par courriel.", "Customer notified on their phone and by email.")
                : L("Client prévenu sur son téléphone.", "Customer notified on their phone.")
        }
        if channels.contains("email") {
            return L("Client prévenu par courriel seulement : il n'a pas activé les notifications sur son téléphone.", "Customer notified by email only: notifications are off on their phone.")
        }
        return L("Le client n'a pas pu être prévenu (aucun courriel ni notification).", "The customer could not be notified (no email or notifications).")
    }
}

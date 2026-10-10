import SwiftUI

/// "Mes commandes" — the customer side of order history has never existed
/// natively before (only the owner's order queue did); `orders_customer_select`
/// (migration 0156) already scopes rows to the caller, so this is purely a
/// read-only presentation layer over SupabaseManager.loadMyOrders().
struct OrderHistoryView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @EnvironmentObject var router: DeepLinkRouter
    @State private var reorderError = false
    @State private var reordering = false
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        Group {
            if supabase.ordersLoadFailed {
                VStack(spacing: 16) {
                    Text(isFrench ? "Vos commandes n’ont pas pu être chargées." : "Your orders could not be loaded.")
                        .font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                    Button(isFrench ? "Réessayer" : "Retry") { Task { await supabase.loadMyOrders() } }
                        .buttonStyle(.borderedProminent).tint(MinervaColor.emerald)
                }.padding(24)
            } else if supabase.isLoadingOrders && supabase.myOrders.isEmpty {
                ScrollView {
                    VStack(spacing: 14) {
                        Skeletons.list(count: 4)
                    }
                    .padding(18)
                }
            } else if supabase.myOrders.isEmpty {
                ContentUnavailableView(
                    isFrench ? "Aucune commande" : "No orders yet",
                    systemImage: "bag",
                    description: Text(isFrench
                        ? "Vos commandes passées apparaîtront ici."
                        : "Your past orders will show up here.")
                )
            } else {
                ScrollView {
                    VStack(spacing: 10) {
                        summaryRow
                        ForEach(supabase.myOrders) { order in
                            orderCard(order)
                        }
                    }
                    .padding(18)
                }
                .refreshable { await supabase.loadMyOrders() }
            }
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Mes commandes" : "My orders")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await supabase.loadMyOrders()
        }
        .toolbar { Button { Task { await supabase.loadMyOrders() } } label: { Label(isFrench ? "Actualiser" : "Refresh", systemImage: "arrow.clockwise") } }
        .alert(isFrench ? "Panier indisponible" : "Basket unavailable", isPresented: $reorderError) {
            Button("OK", role: .cancel) { }
        } message: { Text(isFrench ? "Un produit ou format a changé. Choisissez dans le menu actuel." : "An item or size has changed. Choose from the current menu.") }
    }

    private var summaryRow: some View {
        HStack(spacing: 10) {
            statTile(
                value: "\(supabase.myOrders.count)",
                label: isFrench ? "commandes" : "orders"
            )
            statTile(
                value: currencyString(supabase.myOrders.reduce(0) { $0 + $1.total }),
                label: isFrench ? "total cumulé" : "lifetime total"
            )
        }
    }

    private func statTile(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.mv(size: 19, weight: .bold, design: .rounded))
                .foregroundStyle(MinervaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.mv(size: 11))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func orderCard(_ order: CustomerOrder) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(order.createdAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.mv(size: 12))
                    .foregroundStyle(MinervaColor.inkFaint)
                Spacer()
                statusBadge(order.status)
            }
            if !order.items.isEmpty {
                Text(itemsSummary(order.items))
                    .font(.mv(size: 13, weight: .medium))
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if !["servie", "annulee"].contains(order.status) {
                let steps = ["soumise", "confirmee", "en_preparation", "prete"]
                let current = steps.firstIndex(of: order.status) ?? -1
                HStack(alignment: .top, spacing: 6) {
                    ForEach(Array(steps.enumerated()), id: \.offset) { index, status in
                        VStack(alignment: .leading, spacing: 6) {
                            Capsule().fill(index <= current ? MinervaColor.emerald : MinervaColor.border).frame(height: 3)
                            Text(statusInfo(status).0).font(.mv(size: 10)).foregroundStyle(MinervaColor.inkSoft)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                    }
                }.padding(.vertical, 8)
                if let estimate = order.estimatedReadyAt {
                    Text((isFrench ? "Disponibilité estimée · " : "Estimated ready time · ") + restaurantTime(estimate))
                        .font(.mv(size: 12)).foregroundStyle(MinervaColor.emeraldDark)
                }
            }
            if order.status == "annulee", let reason = order.cancellationReason {
                Text(reason).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft)
            }
            DisclosureGroup(isFrench ? "Détail de la commande" : "Order details") {
                ForEach(order.items) { item in
                    HStack(alignment: .top) {
                        Text("\(item.quantity) × \(item.itemName)")
                        Spacer()
                        Text(currencyString(item.unitPrice * Double(item.quantity)))
                    }.font(.mv(size: 12)).padding(.vertical, 3)
                }
            }.font(.mv(size: 13, weight: .medium)).tint(MinervaColor.emeraldDark)
            HStack {
                if ["servie", "annulee"].contains(order.status) {
                    Button(isFrench ? "Recommander" : "Order again") { Task { await reorder(order) } }
                        .font(.mv(size: 12, weight: .semibold)).disabled(reordering)
                }
                Spacer()
                Text(currencyString(order.total))
                    .font(.mv(size: 14, weight: .bold))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }
        }
        .padding(14)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func reorder(_ order: CustomerOrder) async {
        reordering = true
        defer { reordering = false }
        await supabase.fetchMenu()
        var cart: [String: Int] = [:]
        for line in order.items {
            guard let item = supabase.menuItems.first(where: { $0.id == line.menuItemId }) else { reorderError = true; return }
            let options = item.priceOptions ?? []
            let matches = options.filter { line.itemName == "\(item.name) · \($0.label)" }
            guard options.isEmpty || matches.count == 1 else { reorderError = true; return }
            let key = nativeMenuCartKey(menuItemId: item.id, priceOptionId: matches.first?.id)
            cart[key, default: 0] += line.quantity
        }
        guard !cart.isEmpty, resolveNativeCustomerCart(cart, items: supabase.menuItems) != nil else { reorderError = true; return }
        router.pendingReorderRestaurantId = supabase.customer?.restaurantId
        router.pendingReorderCustomerId = supabase.customer?.id
        router.pendingReorderCart = cart
        router.pendingTab = .order
    }

    private func itemsSummary(_ items: [CustomerOrderItem]) -> String {
        let names = items.prefix(2).map { "\($0.quantity)× \($0.itemName)" }
        let suffix = items.count > 2 ? (isFrench ? " +\(items.count - 2) autre(s)" : " +\(items.count - 2) more") : ""
        return names.joined(separator: ", ") + suffix
    }

    private func statusBadge(_ status: String) -> some View {
        let (label, color) = statusInfo(status)
        return Text(label)
            .font(.mv(size: 10.5, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(color.opacity(0.14))
            .clipShape(Capsule())
    }

    private func statusInfo(_ status: String) -> (String, Color) {
        switch status {
        case "soumise":
            return (isFrench ? "Reçue" : "Received", MinervaColor.emeraldDark)
        case "confirmee":
            return (isFrench ? "Acceptée" : "Accepted", MinervaColor.emeraldDark)
        case "en_preparation":
            return (isFrench ? "En préparation" : "Preparing", .orange)
        case "prete":
            return (isFrench ? "Prête" : "Ready", MinervaColor.emerald)
        case "servie":
            return (isFrench ? "Terminée" : "Completed", MinervaColor.inkFaint)
        case "annulee":
            return (isFrench ? "Annulée" : "Cancelled", .red)
        default:
            return (status.capitalized, MinervaColor.inkFaint)
        }
    }

    private func currencyString(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "CAD"
        formatter.locale = Locale(identifier: isFrench ? "fr_CA" : "en_CA")
        return formatter.string(from: NSNumber(value: value)) ?? "0,00 $"
    }

    private func restaurantTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: isFrench ? "fr_CA" : "en_CA")
        formatter.timeZone = supabase.restaurantTimezone
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

import SwiftUI

/// "Mes commandes" — the customer side of order history has never existed
/// natively before (only the owner's order queue did); `orders_customer_select`
/// (migration 0156) already scopes rows to the caller, so this is purely a
/// read-only presentation layer over SupabaseManager.loadMyOrders().
struct OrderHistoryView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        Group {
            if supabase.isLoadingOrders && supabase.myOrders.isEmpty {
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
            if supabase.myOrders.isEmpty { await supabase.loadMyOrders() }
        }
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
            HStack {
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
            return (isFrench ? "Nouvelle" : "New", MinervaColor.emeraldDark)
        case "en_preparation":
            return (isFrench ? "En préparation" : "Preparing", .orange)
        case "prete":
            return (isFrench ? "Prête" : "Ready", MinervaColor.emerald)
        case "servie":
            return (isFrench ? "Servie" : "Served", MinervaColor.inkFaint)
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
        formatter.locale = Locale(identifier: "fr_CA")
        return formatter.string(from: NSNumber(value: value)) ?? "0,00 $"
    }
}

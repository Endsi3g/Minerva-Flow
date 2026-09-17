import SwiftUI

struct OwnerMainTabView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection) {
            OwnerOverviewView()
                .tabItem { Label("Overview", systemImage: "rectangle.grid.2x2.fill") }
                .tag(0)
            OwnerOrdersView()
                .tabItem { Label("Orders", systemImage: "list.clipboard.fill") }
                .tag(1)
            OwnerMenuView()
                .tabItem { Label("Menu", systemImage: "fork.knife") }
                .tag(2)
            OwnerLoyaltyView()
                .tabItem { Label("Loyalty", systemImage: "heart.text.square.fill") }
                .tag(3)
            OwnerManagementView()
                .tabItem { Label("Manage", systemImage: "slider.horizontal.3") }
                .tag(4)
        }
        .tint(MinervaColor.emeraldDark)
    }
}

private struct OwnerOrdersView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @State private var filter = "All"
    @State private var message: String?
    private let filters = ["All", "soumise", "en_preparation", "prete", "servie"]
    private var visibleOrders: [NativeOwnerOrder] { filter == "All" ? supabase.ownerOrders : supabase.ownerOrders.filter { $0.status == filter } }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 14) {
                Text("Orders").font(MinervaFont.display(30, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(filters, id: \.self) { value in
                            Button(value == "All" ? value : statusLabel(value)) { filter = value }
                                .buttonStyle(.bordered).tint(filter == value ? MinervaColor.emeraldDark : MinervaColor.inkFaint)
                        }
                    }
                }
                if visibleOrders.isEmpty {
                    ContentUnavailableView("No orders", systemImage: "tray", description: Text("New orders from this location will appear here."))
                } else {
                    List(visibleOrders) { order in
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(order.guestName).font(.headline)
                                Text(statusLabel(order.status)).font(.caption).foregroundStyle(MinervaColor.inkFaint)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 7) {
                                Text(order.total.cad).font(.subheadline.weight(.semibold)).foregroundStyle(MinervaColor.emeraldDark)
                                Menu("Update") {
                                    ForEach(filters.dropFirst(), id: \.self) { status in
                                        Button(statusLabel(status)) { Task {
                                            let ok = await supabase.updateOwnerOrderStatus(order.id, restaurantId: order.restaurantId, status: status)
                                            message = ok ? "Order status updated." : "The order could not be updated."
                                        } }
                                    }
                                    Button("Notify customer") { Task {
                                        let ok = await supabase.notifyOwnerOrder(order.id, restaurantId: order.restaurantId)
                                        message = ok ? "The customer was notified by the available channels." : "No notification channel is available for this order."
                                    } }
                                }.font(.caption.weight(.semibold))
                            }
                        }.listRowBackground(Color.white)
                    }.listStyle(.plain)
                }
            }.padding(20).background(MinervaColor.cream.ignoresSafeArea())
            .toolbar { ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() } }
            .refreshable { await supabase.refreshOwnerOperations() }
            .alert("Orders", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) { Button("OK", role: .cancel) {} } message: { Text(message ?? "") }
        }
    }

    private func statusLabel(_ value: String) -> String {
        ["soumise": "New", "en_preparation": "Preparing", "prete": "Ready", "servie": "Served"][value] ?? value.capitalized
    }
}

extension Double {
    var cad: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "CAD"
        formatter.locale = Locale(identifier: "fr_CA")
        return formatter.string(from: NSNumber(value: self)) ?? "—"
    }
}

private struct OwnerOverviewView: View {
    @EnvironmentObject private var supabase: SupabaseManager

    private var brandName: String { supabase.ownerBranding?.brandName ?? "Minerva Flow" }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 12) {
                        if let logo = supabase.ownerBranding?.logoUrl, let url = URL(string: logo) {
                            AsyncImage(url: url) { image in image.resizable().scaledToFit() } placeholder: { Image(systemName: "building.2.fill") }
                                .frame(width: 44, height: 44).clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            Image(systemName: "building.2.fill").font(.title2).foregroundStyle(MinervaColor.emeraldDark)
                                .frame(width: 44, height: 44).background(MinervaColor.emerald.opacity(0.12)).clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Owner workspace").font(.caption.weight(.semibold)).foregroundStyle(MinervaColor.inkFaint)
                            Text(brandName).font(MinervaFont.display(27, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your locations").font(MinervaFont.display(21, weight: .semibold))
                        Text("Switch locations while keeping one unified brand identity.").font(.subheadline).foregroundStyle(MinervaColor.inkSoft)
                    }
                    ForEach(supabase.ownerRestaurants) { restaurant in
                        HStack(spacing: 14) {
                            Image(systemName: "storefront.fill").foregroundStyle(MinervaColor.emeraldDark).frame(width: 38, height: 38).background(MinervaColor.emerald.opacity(0.1)).clipShape(Circle())
                            VStack(alignment: .leading, spacing: 3) {
                                Text(restaurant.name).font(.headline).foregroundStyle(MinervaColor.ink)
                                Text(restaurant.city ?? "Location").font(.caption).foregroundStyle(MinervaColor.inkFaint)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(MinervaColor.inkFaint)
                        }
                        .padding(15).background(.white).clipShape(RoundedRectangle(cornerRadius: 16)).shadow(color: .black.opacity(0.04), radius: 8, y: 3)
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        Text("This month").font(MinervaFont.display(21, weight: .semibold))
                        HStack(spacing: 10) {
                            OwnerMetric(title: "Sales", value: supabase.ownerMetrics.monthRevenue.cad, icon: "chart.line.uptrend.xyaxis")
                            OwnerMetric(title: "Orders", value: "\(supabase.ownerMetrics.monthOrders)", icon: "list.clipboard")
                        }
                    }
                    HStack(spacing: 10) {
                        OwnerMetric(title: "Locations", value: "\(supabase.ownerRestaurants.count)", icon: "building.2")
                        OwnerMetric(title: "Status", value: "Active", icon: "checkmark.seal")
                    }
                    Text("Powered by Minerva Flow").font(.caption2).foregroundStyle(MinervaColor.inkFaint).frame(maxWidth: .infinity, alignment: .center).padding(.top, 8)
                }
                .padding(20)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationBarHidden(true)
        }
    }
}

struct OwnerMetric: View {
    let title: String; let value: String; let icon: String
    var body: some View { VStack(alignment: .leading, spacing: 8) { Image(systemName: icon).foregroundStyle(MinervaColor.emeraldDark); Text(value).font(.title3.bold()).foregroundStyle(MinervaColor.ink); Text(title).font(.caption).foregroundStyle(MinervaColor.inkFaint) }.frame(maxWidth: .infinity, alignment: .leading).padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 14)) }
}

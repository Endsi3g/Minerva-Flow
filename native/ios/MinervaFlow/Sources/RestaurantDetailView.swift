import SwiftUI
import MapKit

/// A restaurant's public profile, reached from the discovery map before
/// someone is necessarily a loyalty customer there — company info, its
/// live offers, and its menu (browsable, with each item opening its own
/// MenuItemDetailView), plus a way to actually get directions instead of
/// only browsing.
struct RestaurantDetailView: View {
    let restaurantId: String
    let previewName: String
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    @State private var detail: DiscoverRestaurantResponse?
    @State private var isLoading = true
    @State private var selectedCategory: String?

    private var categories: [String] {
        guard let items = detail?.menuItems else { return [] }
        var seen: [String] = []
        for item in items {
            let key = item.category?.trimmingCharacters(in: .whitespaces).isEmpty == false ? item.category! : "Autres"
            if !seen.contains(key) { seen.append(key) }
        }
        return seen
    }

    private var itemsInSelectedCategory: [NativeMenuItem] {
        guard let detail, let selectedCategory else { return [] }
        return detail.menuItems.filter { ($0.category?.isEmpty == false ? $0.category! : "Autres") == selectedCategory }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let detail {
                    VStack(alignment: .leading, spacing: 22) {
                        header(for: detail.restaurant)

                        if !detail.offers.isEmpty {
                            offersSection(detail.offers)
                        }

                        if selectedCategory == nil {
                            categoryGrid
                        } else {
                            itemListForCategory
                        }
                    }
                    .padding(18)
                } else if isLoading {
                    VStack { Spacer(minLength: 200); ProgressView(); Spacer(minLength: 200) }
                } else {
                    VStack(spacing: 8) {
                        Spacer(minLength: 200)
                        Text("Impossible de charger ce restaurant.")
                            .font(.system(size: 13))
                            .foregroundStyle(MinervaColor.inkSoft)
                        Spacer(minLength: 200)
                    }
                }
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle(previewName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(selectedCategory == nil ? "Fermer" : "Catégories") {
                        if selectedCategory == nil { dismiss() } else { selectedCategory = nil }
                    }
                }
            }
            .task {
                isLoading = true
                detail = await supabase.fetchRestaurantDetail(id: restaurantId)
                isLoading = false
            }
        }
    }

    private func header(for restaurant: DiscoverRestaurantDetail) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(restaurant.name)
                .font(MinervaFont.display(24))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)

            if let description = restaurant.description {
                Text(description)
                    .font(.system(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let address = restaurant.address {
                HStack(spacing: 6) {
                    Image(systemName: "mappin.circle.fill")
                    Text([address, restaurant.city].compactMap { $0 }.joined(separator: ", "))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .font(.system(size: 12))
                .foregroundStyle(MinervaColor.inkSoft)
            }

            HStack(spacing: 10) {
                if let lat = restaurant.lat, let lng = restaurant.lng {
                    Button {
                        openDirections(lat: lat, lng: lng, name: restaurant.name)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "arrow.triangle.turn.up.right.circle.fill")
                            Text("Itinéraire")
                        }
                        .font(.system(size: 12.5, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                    }
                    .foregroundStyle(.white)
                    .background(MinervaColor.emerald)
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                    .buttonStyle(PressableButtonStyle())
                }

                if let phone = restaurant.phone, let url = URL(string: "tel:\(phone.filter(\.isNumber))") {
                    Link(destination: url) {
                        Image(systemName: "phone.fill")
                            .font(.system(size: 13))
                            .frame(width: 42, height: 38)
                    }
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .background(MinervaColor.emerald.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                }
            }
        }
    }

    private func offersSection(_ offers: [RestaurantDiscoverOffer]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Offres en ce moment")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ForEach(offers) { offer in
                VStack(alignment: .leading, spacing: 3) {
                    Text(offer.title)
                        .font(.system(size: 13.5, weight: .semibold))
                        .fixedSize(horizontal: false, vertical: true)
                    if let description = offer.description {
                        Text(description)
                            .font(.system(size: 12))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .foregroundStyle(MinervaColor.emeraldDark)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(MinervaColor.emerald.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    private var categoryGrid: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Menu")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            if categories.isEmpty {
                Text("Ce restaurant n'a pas encore publié son menu.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
            } else {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(categories, id: \.self) { category in
                        Button {
                            selectedCategory = category
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Image(systemName: "fork.knife")
                                    .font(.system(size: 17))
                                    .foregroundStyle(MinervaColor.emerald)
                                Text(category)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(MinervaColor.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14)
                        }
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .buttonStyle(PressableButtonStyle())
                    }
                }
            }
        }
    }

    private var itemListForCategory: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(selectedCategory ?? "")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ForEach(itemsInSelectedCategory) { item in
                NavigationLink {
                    MenuItemDetailView(item: item, restaurantId: restaurantId, allItemsInCategory: itemsInSelectedCategory)
                } label: {
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.name)
                                .font(.system(size: 13.5, weight: .medium))
                                .foregroundStyle(MinervaColor.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Text(String(format: "%.2f $", item.price))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(MinervaColor.emeraldDark)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(MinervaColor.inkFaint)
                    }
                    .padding(14)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func openDirections(lat: Double, lng: Double, name: String) {
        let placemark = MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng))
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = name
        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }
}

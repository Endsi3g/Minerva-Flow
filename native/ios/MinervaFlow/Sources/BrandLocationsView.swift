import SwiftUI

/// Uses the actual brand locations, including places without map coordinates.
struct BrandLocationsView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var language = AppLanguage.fr.rawValue
    var isOwner = false
    @State private var restaurants: [NativeEnrollmentRestaurant] = []
    @State private var loading = true
    @State private var error: String?
    private var isFrench: Bool { language == AppLanguage.fr.rawValue }
    private struct Response: Decodable { let restaurants: [NativeEnrollmentRestaurant] }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text(isFrench ? "Emplacements" : "Locations").font(MinervaFont.display(30, weight: .semibold))
                Text(isFrench ? "Choisissez un lieu pour retrouver son menu et ses informations." : "Choose a location to find its menu and information.").font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                if loading { ProgressView().frame(maxWidth: .infinity).padding() }
                if let error {
                    Text(error).font(.mv(size: 14)).foregroundStyle(.red)
                    Button(isFrench ? "Réessayer" : "Retry") { Task { await load() } }
                }
                if !restaurants.isEmpty {
                    CompteGroup {
                        ForEach(restaurants) { restaurant in
                            if isOwner {
                                Button { Task { await supabase.selectOwnerRestaurant(restaurant.id); dismiss() } } label: {
                                    locationLabel(restaurant)
                                }.buttonStyle(.plain)
                            } else {
                                NavigationLink { RestaurantDetailView(restaurantId: restaurant.id, previewName: restaurant.name) } label: { locationLabel(restaurant) }.buttonStyle(.plain)
                            }
                            if restaurants.last?.id != restaurant.id { CompteSeparator() }
                        }
                    }
                } else if !loading && error == nil {
                    ContentUnavailableView(isFrench ? "Aucun emplacement" : "No locations", systemImage: "storefront")
                }
            }.padding(20).frame(maxWidth: 760).frame(maxWidth: .infinity)
        }.background(MinervaColor.cream.ignoresSafeArea()).foregroundStyle(MinervaColor.ink)
            .navigationBarTitleDisplayMode(.inline).task { await load() }.refreshable { await load() }
    }
    private func locationLabel(_ restaurant: NativeEnrollmentRestaurant) -> some View {
        CompteRowLabel(icon: "storefront", title: restaurant.name,
            subtitle: [restaurant.address, restaurant.city].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "),
            trailing: isOwner && restaurant.id == supabase.selectedOwnerRestaurantId ? (isFrench ? "Actif" : "Active") : nil)
    }
    private func load() async {
        loading = true; error = nil
        defer { loading = false }
        do {
            var url = URLComponents(url: Config.apiBaseURL.appending(path: "/api/portal/locations"), resolvingAgainstBaseURL: false)!
            url.queryItems = [URLQueryItem(name: "mode", value: isOwner ? "owner" : "client")]
            var request = URLRequest(url: url.url!)
            request.setValue("Bearer \(try await supabase.client.auth.session.accessToken)", forHTTPHeaderField: "Authorization")
            if !isOwner, let id = supabase.customer?.restaurantId { request.setValue(id, forHTTPHeaderField: "x-restaurant-id") }
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            restaurants = try JSONDecoder().decode(Response.self, from: data).restaurants
        } catch { self.error = isFrench ? "Impossible de charger les emplacements. Réessayez." : "Could not load locations. Try again." }
    }
}

import SwiftUI
import MapKit

/// Reached by tapping the map-pin icon on Home — every participating
/// restaurant with coordinates on file, sorted by distance once location
/// permission is granted. Tapping a pin or a list row opens
/// RestaurantDetailView for that restaurant's full profile, offers, and
/// menu, matching the "discover, then decide to order or visit in
/// person" flow described for this screen.
struct RestaurantMapView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @EnvironmentObject var location: LocationManager
    @Environment(\.dismiss) private var dismiss

    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 46.8139, longitude: -71.2080), span: MKCoordinateSpan(latitudeDelta: 3, longitudeDelta: 3))
    )
    @State private var selectedRestaurant: DiscoverRestaurant?
    @State private var hasCenteredOnUser = false
    @State private var hasFitToRestaurants = false

    private enum PlaceFilter: String, CaseIterable { case all, cafe, restaurant
        var label: String {
            switch self {
            case .all: return "Tous"
            case .cafe: return "Cafés"
            case .restaurant: return "Restaurants"
            }
        }
    }
    @State private var placeFilter: PlaceFilter = .all

    private var filteredRestaurants: [DiscoverRestaurant] {
        switch placeFilter {
        case .all: return supabase.nearbyRestaurants
        case .cafe: return supabase.nearbyRestaurants.filter { ($0.serviceModel ?? "restaurant") == "cafe" || $0.serviceModel == "hybrid" }
        case .restaurant: return supabase.nearbyRestaurants.filter { ($0.serviceModel ?? "restaurant") == "restaurant" || $0.serviceModel == "hybrid" }
        }
    }

    private var sortedRestaurants: [DiscoverRestaurant] {
        guard let userLocation = location.currentLocation else { return filteredRestaurants }
        return filteredRestaurants.sorted {
            distance(from: userLocation, to: $0) < distance(from: userLocation, to: $1)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Map(position: $cameraPosition, selection: $selectedRestaurant) {
                    UserAnnotation()
                    ForEach(filteredRestaurants) { restaurant in
                        Marker(restaurant.name, systemImage: "fork.knife.circle.fill", coordinate: CLLocationCoordinate2D(latitude: restaurant.lat, longitude: restaurant.lng))
                            .tint(MinervaColor.emerald)
                            .tag(restaurant)
                    }
                }
                .mapControls {
                    MapUserLocationButton()
                    MapCompass()
                }
                .ignoresSafeArea(edges: .top)

                // Every branch of restaurantList must sit on an opaque
                // ground — the empty-state and loading-skeleton branches
                // previously had none, so the native Map (grey with no
                // tiles loaded, e.g. in Simulator) showed through right
                // behind that cream-styled text, reading as a broken
                // half-cream-half-native seam. One background at this
                // level guarantees that regardless of which branch renders.
                VStack(spacing: 0) {
                    placeFilterControl
                    restaurantList
                }
                .background(MinervaColor.cream)
            }
            .navigationTitle("Près de vous")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
            .task {
                if location.authorizationStatus == .notDetermined {
                    location.requestPermission()
                } else {
                    location.requestLocation()
                }
                if supabase.nearbyRestaurants.isEmpty {
                    await supabase.fetchNearbyRestaurants()
                }
                // The hardcoded 3°/3° default span is province-scale — fine
                // as a fallback with zero data, but once real restaurants
                // load, fit the camera to where they actually are instead
                // of leaving a demo cluster of nearby pins zoomed out to
                // the point they visually overlap and become hard to tap
                // individually. Only applies before the user's own location
                // is known (see onChange below, which takes over once it
                // arrives) and only once, so it doesn't fight a person who
                // has already panned/zoomed manually.
                if !hasFitToRestaurants && !hasCenteredOnUser, let region = boundingRegion(for: filteredRestaurants) {
                    hasFitToRestaurants = true
                    withAnimation {
                        cameraPosition = .region(region)
                    }
                }
            }
            .onChange(of: location.currentLocation) { _, newLocation in
                guard let newLocation, !hasCenteredOnUser else { return }
                hasCenteredOnUser = true
                withAnimation {
                    cameraPosition = .region(
                        MKCoordinateRegion(center: newLocation.coordinate, span: MKCoordinateSpan(latitudeDelta: 0.15, longitudeDelta: 0.15))
                    )
                }
            }
            .sheet(item: $selectedRestaurant) { restaurant in
                RestaurantDetailView(restaurantId: restaurant.id, previewName: restaurant.name)
            }
        }
    }

    private var placeFilterControl: some View {
        Picker("Filtrer", selection: $placeFilter) {
            ForEach(PlaceFilter.allCases, id: \.self) { filter in
                Text(filter.label).tag(filter)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 14)
        .padding(.top, 10)
        .background(MinervaColor.cream)
    }

    private var restaurantList: some View {
        VStack(spacing: 0) {
            if location.authorizationStatus == .denied || location.authorizationStatus == .restricted {
                HStack(spacing: 8) {
                    Image(systemName: "location.slash")
                    Text("Activez la localisation dans Réglages pour trier par distance.")
                        .font(.system(size: 11.5))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(MinervaColor.inkSoft)
                .padding(12)
                .frame(maxWidth: .infinity)
                .background(MinervaColor.creamSoft)
            }

            if supabase.isLoadingDiscover && supabase.nearbyRestaurants.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(0..<3, id: \.self) { _ in
                            SkeletonBlock(cornerRadius: 14).frame(width: 190, height: 74)
                        }
                    }
                    .padding(14)
                }
            } else if filteredRestaurants.isEmpty {
                Text(supabase.nearbyRestaurants.isEmpty
                    ? "Aucun restaurant participant n'a encore ajouté son adresse."
                    : "Aucun résultat pour ce filtre.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(20)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(sortedRestaurants) { restaurant in
                            Button {
                                selectedRestaurant = restaurant
                            } label: {
                                restaurantCard(restaurant)
                            }
                            .buttonStyle(PressableButtonStyle())
                        }
                    }
                    .padding(14)
                }
                .horizontalEdgeFade()
                .background(MinervaColor.cream)
            }
        }
    }

    private func restaurantCard(_ restaurant: DiscoverRestaurant) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(restaurant.name)
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                    .lineLimit(1)
                Spacer(minLength: 6)
                if let userLocation = location.currentLocation {
                    Text(distanceLabel(from: userLocation, to: restaurant))
                        .font(.system(size: 10.5, weight: .bold))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
            }
            if let city = restaurant.city {
                Text(city)
                    .font(.system(size: 11))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
        }
        .padding(12)
        .frame(width: 190, alignment: .leading)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: MinervaColor.ink.opacity(0.08), radius: 8, x: 0, y: 3)
    }

    private func distance(from location: CLLocation, to restaurant: DiscoverRestaurant) -> CLLocationDistance {
        CLLocation(latitude: restaurant.lat, longitude: restaurant.lng).distance(from: location)
    }

    private func distanceLabel(from location: CLLocation, to restaurant: DiscoverRestaurant) -> String {
        let meters = distance(from: location, to: restaurant)
        if meters < 1000 { return "\(Int(meters)) m" }
        return String(format: "%.1f km", meters / 1000)
    }

    /// Fits a region around every restaurant's real coordinates, with
    /// padding and a sensible minimum span so a single restaurant (or a
    /// tight demo cluster) doesn't zoom in so far the map looks broken —
    /// this is what replaces the old hardcoded province-wide default.
    private func boundingRegion(for restaurants: [DiscoverRestaurant]) -> MKCoordinateRegion? {
        guard !restaurants.isEmpty else { return nil }
        let lats = restaurants.map(\.lat)
        let lngs = restaurants.map(\.lng)
        guard let minLat = lats.min(), let maxLat = lats.max(),
              let minLng = lngs.min(), let maxLng = lngs.max() else { return nil }

        let center = CLLocationCoordinate2D(latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2)
        let padding = 1.6
        let minSpan = 0.05
        let span = MKCoordinateSpan(
            latitudeDelta: max(minSpan, (maxLat - minLat) * padding),
            longitudeDelta: max(minSpan, (maxLng - minLng) * padding)
        )
        return MKCoordinateRegion(center: center, span: span)
    }
}

extension DiscoverRestaurant: Hashable {
    static func == (lhs: DiscoverRestaurant, rhs: DiscoverRestaurant) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

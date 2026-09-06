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

    private var sortedRestaurants: [DiscoverRestaurant] {
        guard let userLocation = location.currentLocation else { return supabase.nearbyRestaurants }
        return supabase.nearbyRestaurants.sorted {
            distance(from: userLocation, to: $0) < distance(from: userLocation, to: $1)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Map(position: $cameraPosition, selection: $selectedRestaurant) {
                    UserAnnotation()
                    ForEach(supabase.nearbyRestaurants) { restaurant in
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

                restaurantList
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
                ProgressView().padding(24)
            } else if supabase.nearbyRestaurants.isEmpty {
                Text("Aucun restaurant participant n'a encore ajouté son adresse.")
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
}

extension DiscoverRestaurant: Hashable {
    static func == (lhs: DiscoverRestaurant, rhs: DiscoverRestaurant) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

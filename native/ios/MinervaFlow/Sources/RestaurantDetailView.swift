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
    @State private var carouselIndex = 0
    @State private var reviews: [RestaurantReview] = []
    @State private var isLoadingReviews = true
    @State private var showWriteReview = false
    @State private var isJoining = false
    @State private var didJoin = false

    /// True the instant a membership exists anywhere for this restaurant —
    /// the account's own active restaurant, any other membership already
    /// loaded, or one just created this session — so the join button
    /// disappears immediately rather than only after a full data refresh.
    private var isAlreadyMember: Bool {
        didJoin
            || restaurantId == supabase.customer?.restaurantId
            || supabase.allMemberships.contains { $0.restaurantId == restaurantId }
    }

    private var averageRating: Double {
        guard !reviews.isEmpty else { return 0 }
        return Double(reviews.map(\.rating).reduce(0, +)) / Double(reviews.count)
    }

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
                    VStack(alignment: .leading, spacing: 0) {
                        if !detail.restaurant.imageUrls.isEmpty {
                            photoCarousel(detail.restaurant.imageUrls)
                        }

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

                            reviewsSection
                        }
                        .padding(18)
                    }
                } else if isLoading {
                    VStack(alignment: .leading, spacing: 22) {
                        SkeletonBlock(cornerRadius: 6).frame(height: 26)
                        Skeletons.card(height: 70)
                        Skeletons.grid(count: 4)
                    }
                    .padding(18)
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
                isLoadingReviews = true
                reviews = await supabase.fetchRestaurantReviews(restaurantId: restaurantId)
                isLoadingReviews = false
            }
            .sheet(isPresented: $showWriteReview) {
                WriteRestaurantReviewSheet(restaurantId: restaurantId, restaurantName: previewName) {
                    Task { reviews = await supabase.fetchRestaurantReviews(restaurantId: restaurantId) }
                }
            }
        }
    }

    // MARK: - Reviews

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Avis clients")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                if !reviews.isEmpty {
                    HStack(spacing: 3) {
                        Image(systemName: "star.fill").font(.system(size: 11))
                        Text(String(format: "%.1f", averageRating))
                        Text("(\(reviews.count))")
                            .foregroundStyle(MinervaColor.inkFaint)
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                }
                Spacer()
                if supabase.customer?.restaurantId == restaurantId {
                    Button("Écrire un avis") { showWriteReview = true }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
            }

            if isLoadingReviews {
                Skeletons.list(count: 2)
            } else if reviews.isEmpty {
                Text("Soyez le premier à donner votre avis sur ce restaurant.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
            } else {
                VStack(spacing: 10) {
                    ForEach(reviews) { review in
                        reviewRow(review)
                    }
                }
            }
        }
    }

    private func reviewRow(_ review: RestaurantReview) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                ForEach(1...5, id: \.self) { star in
                    Image(systemName: star <= review.rating ? "star.fill" : "star")
                        .font(.system(size: 11))
                }
            }
            .foregroundStyle(MinervaColor.emerald)

            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if !review.imageUrls.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(review.imageUrls.prefix(6).enumerated()), id: \.offset) { _, urlString in
                            AsyncImage(url: URL(string: urlString)) { phase in
                                if let image = phase.image {
                                    image.resizable().scaledToFill()
                                } else {
                                    Rectangle().fill(MinervaColor.ink.opacity(0.06))
                                }
                            }
                            .frame(width: 72, height: 72)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            }

            Text(review.createdAt.formatted(date: .abbreviated, time: .omitted))
                .font(.system(size: 10.5))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
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

            if !isAlreadyMember {
                Button {
                    Task { await performJoin() }
                } label: {
                    HStack(spacing: 6) {
                        if isJoining {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "person.badge.plus")
                            Text("Devenir client")
                        }
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                }
                .foregroundStyle(.white)
                .background(MinervaColor.emeraldDark)
                .clipShape(RoundedRectangle(cornerRadius: 11))
                .buttonStyle(PressableButtonStyle())
                .disabled(isJoining)
            } else if didJoin {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Vous êtes client de ce restaurant")
                }
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(MinervaColor.emeraldDark)
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
                    .accessibilityLabel("Appeler le restaurant")
                }

                if let website = restaurant.website, let url = URL(string: website) {
                    Link(destination: url) {
                        Image(systemName: "globe")
                            .font(.system(size: 13))
                            .frame(width: 42, height: 38)
                    }
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .background(MinervaColor.emerald.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                    .accessibilityLabel("Visiter le site web")
                }

                if let mapsUrlString = restaurant.googleMapsUrl, let url = URL(string: mapsUrlString) {
                    Link(destination: url) {
                        Image(systemName: "star.bubble.fill")
                            .font(.system(size: 13))
                            .frame(width: 42, height: 38)
                    }
                    .accessibilityLabel("Laisser un avis Google")
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .background(MinervaColor.emerald.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                }
            }
        }
    }

    private func photoCarousel(_ imageUrls: [String]) -> some View {
        TabView(selection: $carouselIndex) {
            ForEach(Array(imageUrls.enumerated()), id: \.offset) { index, urlString in
                AsyncImage(url: URL(string: urlString)) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        Rectangle().fill(MinervaColor.ink.opacity(0.06))
                    }
                }
                .tag(index)
                .clipped()
            }
        }
        .tabViewStyle(.page(indexDisplayMode: imageUrls.count > 1 ? .always : .never))
        .frame(height: 220)
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
                                Image(systemName: MenuCategoryIcon.symbolName(for: category))
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

    private func performJoin() async {
        guard !isJoining else { return }
        isJoining = true
        defer { isJoining = false }
        let generator = UINotificationFeedbackGenerator()
        let success = await supabase.joinRestaurant(restaurantId)
        generator.notificationOccurred(success ? .success : .error)
        if success { didJoin = true }
    }
}

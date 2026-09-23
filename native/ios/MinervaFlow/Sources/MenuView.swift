import SwiftUI

/// Full ordering flow: browse the restaurant's live menu grouped by
/// category, build a cart with quantity steppers, then a real checkout
/// sheet (tip selection, tax breakdown, payment method note, submission).
/// Mirrors the web portal's MenuBrowserCard + CheckoutModal pair exactly —
/// including hosted Stripe checkout where the restaurant has Connect enabled,
/// with payment state finalized only by the signed webhook.
/// as a normal `soumise` order. The only structural difference from web:
/// this talks to app/api/portal/menu and /orders instead of a Server
/// Action, since native has no way to call one of those directly.
struct MenuView: View {
    @EnvironmentObject var supabase: SupabaseManager

    @State private var cart: [String: Int] = [:]
    @State private var checkoutOpen = false
    @State private var hasLoadedOnce = false
    @State private var showScanner = false
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    private var cartCount: Int { cart.values.reduce(0, +) }
    private var cartLines: [(item: NativeMenuItem, quantity: Int)] {
        supabase.menuItems.compactMap { item in
            guard let qty = cart[item.id], qty > 0 else { return nil }
            return (item, qty)
        }
    }
    private var cartSubtotal: Double {
        cartLines.reduce(0) { $0 + $1.item.price * Double($1.quantity) }
    }

    private var groupedMenu: [(category: String, items: [NativeMenuItem])] {
        var order: [String] = []
        var buckets: [String: [NativeMenuItem]] = [:]
        for item in supabase.menuItems {
            let key = item.category?.trimmingCharacters(in: .whitespaces).isEmpty == false
                ? item.category!
                : "Autres"
            if buckets[key] == nil {
                buckets[key] = []
                order.append(key)
            }
            buckets[key]?.append(item)
        }
        return order.map { (category: $0, items: buckets[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Group {
                    if supabase.isLoadingMenu && supabase.menuItems.isEmpty {
                        ScrollView {
                            VStack(alignment: .leading, spacing: 22) {
                                SkeletonBlock(cornerRadius: 6).frame(width: 140, height: 24)
                                Skeletons.grid(count: 6)
                            }
                            .padding(18)
                        }
                    } else if supabase.menuItems.isEmpty {
                        ScrollView {
                            VStack(spacing: 20) {
                                emptyState
                                mealSuggestionsSection
                            }
                            .padding(18)
                        }
                    } else {
                        categoryGrid
                    }
                }
                .background(MinervaColor.cream.ignoresSafeArea())

                if cartCount > 0 {
                    cartBar
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showScanner = true
                    } label: {
                        Image(systemName: "qrcode.viewfinder")
                    }
                    .accessibilityLabel("Scanner un code")
                }
            }
            .animation(.easeInOut(duration: 0.25), value: cartCount)
            .task {
                guard !hasLoadedOnce else { return }
                hasLoadedOnce = true
                await supabase.fetchMenu()
                if supabase.nearbyRestaurants.isEmpty {
                    await supabase.fetchNearbyRestaurants()
                }
                if supabase.popularNearby.isEmpty {
                    await supabase.fetchPopularNearby()
                }
                await supabase.fetchMealSuggestions()
            }
            .refreshable { await supabase.fetchMenu() }
            .fullScreenCover(isPresented: $showScanner) {
                ScanToOrderView()
            }
            .sheet(isPresented: $checkoutOpen) {
                CheckoutSheet(
                    lines: cartLines,
                    taxRate: supabase.taxRate,
                    acceptsTips: supabase.acceptsTips,
                    canPayAtReceipt: supabase.canPayAtReceipt && !supabase.isUsingDemoMenuFallback,
                    canPayOnline: supabase.canPayOnline && !supabase.isUsingDemoMenuFallback,
                    pickupEnabled: supabase.pickupEnabled && !supabase.isUsingDemoMenuFallback,
                    deliveryEnabled: supabase.deliveryEnabled && !supabase.isUsingDemoMenuFallback,
                    googleMapsUrl: supabase.restaurantGoogleMapsUrl,
                    onOrdered: {
                        cart = [:]
                        checkoutOpen = false
                    }
                )
            }
            .alert("Erreur", isPresented: Binding(
                get: { supabase.lastError != nil },
                set: { if !$0 { supabase.lastError = nil } }
            )) {
                Button("OK", role: .cancel) { supabase.lastError = nil }
            } message: {
                Text(supabase.lastError ?? "")
            }
        }
    }

    /// Categories first, browsed one at a time — a restaurant with dozens
    /// of items (the "40 cafés" case) would otherwise force one long
    /// scroll to find anything. Each tile shows the category's own item
    /// count so it's obvious how much is behind it before tapping in.
    private var categoryGrid: some View {
        ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Text(isFrench ? "Commander" : "Order")
                    .font(MinervaFont.display(24))
                    .foregroundStyle(MinervaColor.ink)
                    .padding(.top, 4)

                if supabase.isUsingDemoMenuFallback {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "wifi.exclamationmark")
                        VStack(alignment: .leading, spacing: 3) {
                            Text(isFrench ? "Mode démo actif" : "Demo mode active")
                                .font(.system(size: 12.5, weight: .semibold))
                            Text(isFrench ? "Le menu local reste disponible. Réessayez quand la connexion est rétablie." : "The local menu is available. Retry when your connection is restored.")
                                .font(.system(size: 11.5))
                        }
                        Spacer()
                        Button(isFrench ? "Réessayer" : "Retry") { Task { await supabase.fetchMenu() } }
                            .font(.system(size: 11.5, weight: .semibold))
                    }
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .padding(12)
                    .background(MinervaColor.emerald.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }

                if supabase.restaurantIsBusy {
                    busyBanner
                }

                if !otherRestaurants.isEmpty {
                    otherRestaurantsSection
                }

                if !supabase.popularNearby.isEmpty {
                    popularNearbySection
                }

                VStack(alignment: .leading, spacing: 10) {
                        Text(isFrench ? "Catégories" : "Categories")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(groupedMenu, id: \.category) { group in
                            NavigationLink {
                                CategoryItemListView(category: group.category, items: group.items, cart: $cart)
                            } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    Image(systemName: MenuCategoryIcon.symbolName(for: group.category))
                                        .font(.system(size: 20))
                                        .foregroundStyle(MinervaColor.emerald)
                                    Text(group.category)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(MinervaColor.ink)
                                        .fixedSize(horizontal: false, vertical: true)
                                    Text("\(group.items.count) article\(group.items.count > 1 ? "s" : "")")
                                        .font(.system(size: 11))
                                        .foregroundStyle(MinervaColor.inkFaint)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(16)
                            }
                            .background(MinervaColor.creamSoft)
                            .clipShape(RoundedRectangle(cornerRadius: 18))
                            .buttonStyle(PressableButtonStyle())
                        }
                    }
                }

                mealSuggestionsSection

                Color.clear.frame(height: cartCount > 0 ? 80 : 8)
            }
            .padding(18)
        }
    }

    private var mealSuggestionsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(isFrench ? "Proposer un plat" : "Suggest a dish")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            Text(isFrench ? "Une idée pour le menu ? Les clients peuvent voter." : "Have a menu idea? Customers can vote for it.")
                .font(.system(size: 11.5))
                .foregroundStyle(MinervaColor.inkFaint)
            MealSuggestionComposer(isFrench: isFrench)
            if !supabase.customerMealSuggestions.isEmpty {
                VStack(spacing: 8) {
                    ForEach(supabase.customerMealSuggestions) { suggestion in
                        HStack(spacing: 10) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(suggestion.title).font(.system(size: 12.5, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                                if let description = suggestion.description, !description.isEmpty {
                                    Text(description).font(.system(size: 11)).foregroundStyle(MinervaColor.inkFaint).lineLimit(2)
                                }
                            }
                            Spacer(minLength: 4)
                            Button {
                                Task { _ = await supabase.voteForMealSuggestion(suggestion) }
                            } label: {
                                Label("\(suggestion.voteCount)", systemImage: suggestion.hasVoted ? "hand.thumbsup.fill" : "hand.thumbsup")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(suggestion.hasVoted ? MinervaColor.emeraldDark : MinervaColor.inkSoft)
                            }
                            .disabled(suggestion.hasVoted || suggestion.status != "open")
                        }
                        .padding(11)
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
        .padding(14)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border.opacity(0.7)))
    }

    private struct MealSuggestionComposer: View {
        @EnvironmentObject private var supabase: SupabaseManager
        let isFrench: Bool
        @State private var title = ""
        @State private var description = ""
        @State private var submitting = false
        @State private var message: String?

        var body: some View {
            VStack(spacing: 8) {
                TextField(isFrench ? "Nom du plat" : "Dish name", text: $title)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.words)
                    .accessibilityLabel(isFrench ? "Nom du plat suggéré" : "Suggested dish name")
                TextField(isFrench ? "Détails facultatifs" : "Optional details", text: $description, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...4)
                if let message {
                    Text(message).font(.caption).foregroundStyle(MinervaColor.emeraldDark)
                }
                Button {
                    submitting = true
                    message = nil
                    Task {
                        let ok = await supabase.submitMealSuggestion(title: title, description: description)
                        submitting = false
                        if ok {
                            title = ""
                            description = ""
                            message = isFrench ? "Merci, votre idée est proposée au restaurant." : "Thanks, your idea was sent to the restaurant."
                        } else {
                            message = isFrench ? "Échec de l’envoi. Vérifiez le nom et réessayez." : "Could not submit. Check the name and try again."
                        }
                    }
                } label: {
                    HStack {
                        if submitting { ProgressView().tint(.white) }
                        Text(submitting ? (isFrench ? "Envoi…" : "Sending…") : (isFrench ? "Proposer ce plat" : "Suggest this dish"))
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(MinervaColor.emerald)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(submitting || title.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
            }
        }
    }

    private var otherRestaurants: [DiscoverRestaurant] {
        supabase.nearbyRestaurants.filter { $0.id != supabase.customer?.restaurantId }
    }

    /// Cross-restaurant discovery, right from Commander — browsing other
    /// participating restaurants/cafés and their own menus shouldn't
    /// require leaving to the map first.
    private var otherRestaurantsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("D'autres restaurants et cafés")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(otherRestaurants) { restaurant in
                        NavigationLink {
                            RestaurantDetailView(restaurantId: restaurant.id, previewName: restaurant.name)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                franchiseCardImage(restaurant)
                                    .frame(width: 160, height: 90)
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                    .clipped()

                                Text(restaurant.name)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(MinervaColor.ink)
                                    .lineLimit(1)
                                if let city = restaurant.city {
                                    Text(city)
                                        .font(.system(size: 11))
                                        .foregroundStyle(MinervaColor.inkFaint)
                                }
                            }
                            .frame(width: 160, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .horizontalEdgeFade()
        }
    }

    /// A blurred fill behind a sharp, inset copy of the same image — the
    /// restaurant's own photo first, falling back to the owner-configured
    /// workspace/brand logo (Franchise → Logo de votre franchise on the
    /// dashboard), and only falling back further to an icon-on-gradient
    /// placeholder when neither exists.
    private func franchiseCardImage(_ restaurant: DiscoverRestaurant) -> some View {
        let imageURL = (restaurant.imageUrls.first ?? restaurant.workspaceLogoUrl).flatMap(URL.init)

        return ZStack {
            if let imageURL {
                AsyncImage(url: imageURL) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill().blur(radius: 16).saturation(1.1)
                    } else {
                        franchiseCardPlaceholderBlur
                    }
                }
            } else {
                franchiseCardPlaceholderBlur
            }

            Color.black.opacity(0.12)

            if let imageURL {
                AsyncImage(url: imageURL) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                            .frame(width: 62, height: 62)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .shadow(color: .black.opacity(0.25), radius: 6, y: 2)
                    } else {
                        Image(systemName: "storefront.fill").font(.system(size: 22)).foregroundStyle(.white)
                    }
                }
            } else {
                Image(systemName: "storefront.fill").font(.system(size: 22)).foregroundStyle(.white)
            }
        }
    }

    private var franchiseCardPlaceholderBlur: some View {
        LinearGradient(
            colors: [MinervaColor.emerald.opacity(0.65), MinervaColor.emeraldDark.opacity(0.85)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .blur(radius: 20)
    }

    /// Ranked by real order_items quantity across every discoverable
    /// restaurant (see app/api/portal/popular/route.ts) — not a curated
    /// or made-up "trending" list. Tapping an item from a restaurant the
    /// customer isn't a member of opens it in browse mode, same honest
    /// distinction MenuItemDetailView already draws everywhere else.
    private var popularNearbySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Populaire près de vous")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(supabase.popularNearby) { popularItem in
                        NavigationLink {
                            let isOwnRestaurant = popularItem.restaurantId == supabase.customer?.restaurantId
                            let syntheticItem = NativeMenuItem(
                                id: popularItem.id,
                                restaurantId: popularItem.restaurantId,
                                name: popularItem.name,
                                category: popularItem.category,
                                price: popularItem.price,
                                description: nil,
                                active: true,
                                imageUrl: popularItem.imageUrl,
                                imageUrls: popularItem.imageUrl.map { [$0] } ?? []
                            )
                            MenuItemDetailView(
                                item: syntheticItem,
                                restaurantId: popularItem.restaurantId,
                                allItemsInCategory: [syntheticItem],
                                cart: isOwnRestaurant ? $cart : nil
                            )
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                ZStack {
                                    Rectangle().fill(MinervaColor.ink.opacity(0.06))
                                    if let imageUrl = popularItem.imageUrl, let url = URL(string: imageUrl) {
                                        AsyncImage(url: url) { phase in
                                            if let image = phase.image {
                                                image.resizable().scaledToFill()
                                            } else {
                                                Image(systemName: "flame.fill").foregroundStyle(MinervaColor.inkFaint)
                                            }
                                        }
                                    } else {
                                        Image(systemName: "flame.fill").foregroundStyle(MinervaColor.inkFaint)
                                    }
                                }
                                .frame(width: 140, height: 90)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .clipped()

                                Text(popularItem.name)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(MinervaColor.ink)
                                    .lineLimit(1)
                                Text(popularItem.restaurantName)
                                    .font(.system(size: 11))
                                    .foregroundStyle(MinervaColor.inkFaint)
                                    .lineLimit(1)
                            }
                            .frame(width: 140, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .horizontalEdgeFade()
        }
    }

    private var cartBar: some View {
        Button {
            checkoutOpen = true
        } label: {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "cart.fill")
                    Text("\(cartCount) article\(cartCount > 1 ? "s" : "")")
                        .font(.system(size: 13.5, weight: .semibold))
                }
                Spacer()
                HStack(spacing: 4) {
                    Text(String(format: "%.2f $", cartSubtotal))
                        .font(.system(size: 13.5, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12, weight: .bold))
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 15)
        }
        .background(MinervaColor.emerald)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: MinervaColor.ink.opacity(0.15), radius: 12, x: 0, y: 4)
        .buttonStyle(PressableButtonStyle())
        .padding(.horizontal, 18)
        .padding(.bottom, 8)
    }

    /// Same signal as the web menu's delay banner (restaurants.busy_mode_manual
    /// OR the live en_preparation count over busy_threshold, see computeIsBusy) —
    /// a customer ordering from the app shouldn't be surprised by a
    /// slower-than-usual wait any more than one ordering from the web link.
    private var busyBanner: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "clock")
                .font(.system(size: 13))
            Text("\(supabase.restaurantName ?? "Le restaurant") est présentement très occupé — les délais de préparation peuvent être plus longs que d'habitude.")
                .font(.system(size: 12.5))
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(.orange)
        .padding(14)
        .background(Color.orange.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "fork.knife.circle")
                .font(.system(size: 36))
                .foregroundStyle(MinervaColor.inkFaint)
            Text("Aucun plat disponible")
                .font(MinervaFont.display(18))
                .foregroundStyle(MinervaColor.ink)
            Text("Votre restaurant n'a pas encore publié de menu.")
                .font(.system(size: 12.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 34)
    }
}

/// One category's items — the second step of the category-first browse
/// (category grid → this list → MenuItemDetailView). The quantity stepper
/// lives here rather than on the detail page, so adding to cart never
/// requires leaving the list; tapping the item's name/photo instead of the
/// stepper is what opens the full detail page.
struct CategoryItemListView: View {
    let category: String
    let items: [NativeMenuItem]
    @Binding var cart: [String: Int]
    @EnvironmentObject var supabase: SupabaseManager

    var body: some View {
        ScrollView {
            // Lazy so tapping into a large category (50+ demo items) only
            // renders — and only fires each row's AsyncImage for — what's
            // actually on screen, instead of every row at once (the
            // reported "takes forever to open a category" symptom).
            LazyVStack(alignment: .leading, spacing: 10) {
                ForEach(items) { item in
                    menuRow(item)
                }
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(category)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func menuRow(_ item: NativeMenuItem) -> some View {
        let quantity = cart[item.id] ?? 0
        let isFavorite = supabase.customer?.favoriteMenuItemIds.contains(item.id) ?? false

        return HStack(spacing: 12) {
            NavigationLink {
                MenuItemDetailView(item: item, restaurantId: item.restaurantId, allItemsInCategory: items, cart: $cart)
            } label: {
                HStack(spacing: 12) {
                    ZStack(alignment: .topTrailing) {
                        RoundedRectangle(cornerRadius: 12).fill(MinervaColor.ink.opacity(0.05))
                        if let firstImage = item.galleryImageURLs.first, let url = URL(string: firstImage) {
                            AsyncImage(url: url) { phase in
                                if let image = phase.image {
                                    image.resizable().scaledToFill()
                                } else {
                                    Image(systemName: "fork.knife").foregroundStyle(MinervaColor.inkFaint)
                                }
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            Image(systemName: "fork.knife")
                                .font(.system(size: 18))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }

                        Button {
                            let generator = UIImpactFeedbackGenerator(style: .light)
                            generator.impactOccurred()
                            Task { await supabase.toggleFavoriteMenuItem(item.id, favorite: !isFavorite) }
                        } label: {
                            Image(systemName: isFavorite ? "heart.fill" : "heart")
                                .font(.system(size: 10))
                                .foregroundStyle(isFavorite ? .red : .white)
                                .padding(4)
                                .background(.black.opacity(0.35))
                                .clipShape(Circle())
                        }
                        .padding(3)
                        .buttonStyle(.plain)
                        .accessibilityLabel(isFavorite ? "Retirer des favoris" : "Ajouter aux favoris")
                    }
                    .frame(width: 56, height: 56)
                    .clipped()

                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(MinervaColor.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        if let description = item.description {
                            Text(description)
                                .font(.system(size: 11.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                                .lineLimit(2)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Text(String(format: "%.2f $", item.price))
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(MinervaColor.emeraldDark)
                    }
                }
            }
            .buttonStyle(.plain)

            Spacer(minLength: 8)

            stepper(quantity: quantity, itemId: item.id)
        }
        .padding(12)
        .background(quantity > 0 ? MinervaColor.emerald.opacity(0.06) : MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(quantity > 0 ? MinervaColor.emerald.opacity(0.3) : .clear, lineWidth: 1.5)
        )
    }

    private func stepper(quantity: Int, itemId: String) -> some View {
        HStack(spacing: 10) {
            if quantity > 0 {
                Button {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    cart[itemId] = max(0, quantity - 1)
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(MinervaColor.inkSoft)
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityLabel("Diminuer la quantité")

                Text("\(quantity)")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(MinervaColor.ink)
                    .frame(minWidth: 16)
            }

            Button {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                cart[itemId] = quantity + 1
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(MinervaColor.emerald)
            }
            .buttonStyle(PressableButtonStyle())
            .accessibilityLabel("Ajouter au panier")
        }
    }
}

private let tipPresets: [Double] = [0, 0.10, 0.15, 0.20]

/// Full checkout: line-item review, tip selection, tax breakdown, the
/// restaurant's available fulfillment/payment choices, then submission
/// with real success/error states rather than just dismissing and hoping.
struct CheckoutSheet: View {
    let lines: [(item: NativeMenuItem, quantity: Int)]
    let taxRate: Double
    let acceptsTips: Bool
    let canPayAtReceipt: Bool
    let canPayOnline: Bool
    let pickupEnabled: Bool
    let deliveryEnabled: Bool
    var googleMapsUrl: String? = nil
    let onOrdered: () -> Void

    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var tipPct: Double?
    @State private var paymentMethod = ""
    @State private var payOnline = false
    @State private var paymentURL: URL?
    @State private var deliverySelected = false
    @State private var deliveryAddress = ""
    @State private var deliveryQuote: PortalDeliveryQuote?
    @State private var isQuotingDelivery = false
    @State private var isScheduled = false
    @State private var requestedReadyAt = Date(timeIntervalSince1970: Double((Int(Date().timeIntervalSince1970) / 900 + 1) * 900))
    @State private var status: Status = .idle
    @State private var estimatedReadyAt: Date?

    enum Status { case idle, submitting, done, error }

    private var totals: OrderTotals { OrderTotals(lines: lines, taxRate: taxRate, tipPct: tipPct) }
    private var subtotal: Double { totals.subtotal }
    private var taxAmount: Double { totals.taxAmount }
    private var tipAmount: Double { totals.tipAmount }
    private var total: Double { totals.total + (deliverySelected ? (deliveryQuote?.fee ?? 0) : 0) }
    private var checkoutAvailable: Bool {
        (pickupEnabled || deliveryEnabled) && (canPayAtReceipt || canPayOnline)
    }

    var body: some View {
        NavigationStack {
            Group {
                if status == .done {
                    doneState
                } else {
                    formState
                }
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Votre commande")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if status != .done {
                        Button("Fermer") { dismiss() }
                    }
                }
            }
        }
        .onAppear {
            tipPct = acceptsTips ? 0.15 : nil
            payOnline = !canPayAtReceipt && canPayOnline
            deliverySelected = !pickupEnabled && deliveryEnabled
        }
        .interactiveDismissDisabled(status == .submitting)
    }

    private var formState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(spacing: 8) {
                    ForEach(lines, id: \.item.id) { line in
                        HStack {
                            Text("\(line.quantity)× \(line.item.name)")
                                .font(.system(size: 13))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 8)
                            Text(String(format: "%.2f $", line.item.price * Double(line.quantity)))
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(MinervaColor.ink)
                        }
                    }
                }
                .padding(14)
                .background(MinervaColor.creamSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                if acceptsTips {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pourboire")
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(MinervaColor.inkSoft)
                        HStack(spacing: 8) {
                            ForEach(tipPresets, id: \.self) { pct in
                                Button {
                                    tipPct = pct
                                } label: {
                                    Text(pct == 0 ? "Aucun" : "\(Int(pct * 100))%")
                                        .font(.system(size: 12.5, weight: .semibold))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                }
                                .background(tipPct == pct ? MinervaColor.emerald.opacity(0.15) : MinervaColor.creamSoft)
                                .foregroundStyle(tipPct == pct ? MinervaColor.emeraldDark : MinervaColor.inkSoft)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(tipPct == pct ? MinervaColor.emerald : MinervaColor.border)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }
                }

                VStack(spacing: 6) {
                    totalRow("Sous-total", subtotal)
                    totalRow("Taxes", taxAmount)
                    if acceptsTips { totalRow("Pourboire", tipAmount) }
                    if deliverySelected, let deliveryQuote { totalRow("Livraison · \(deliveryQuote.distanceKm.map { String(format: "%.1f km", $0) } ?? "distance estimée")", deliveryQuote.fee) }
                    Divider()
                    totalRow("Total", total, emphasized: true)
                }
                .padding(14)
                .background(MinervaColor.creamSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                if deliveryEnabled {
                    VStack(alignment: .leading, spacing: 9) {
                        Text("Réception")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(MinervaColor.inkSoft)
                        if pickupEnabled {
                            HStack(spacing: 8) {
                                paymentChoice("À emporter", selected: !deliverySelected) {
                                    deliverySelected = false
                                    deliveryQuote = nil
                                }
                                paymentChoice("Livraison", selected: deliverySelected) { deliverySelected = true }
                            }
                        } else {
                            Text("Livraison")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(MinervaColor.emeraldDark)
                        }
                        if deliverySelected {
                            TextField("Adresse complète", text: $deliveryAddress, prompt: Text("123, rue Principale, Montréal").foregroundStyle(MinervaColor.inkFaint))
                                .textContentType(.fullStreetAddress)
                                .textInputAutocapitalization(.words)
                                .padding(12)
                                .background(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 11))
                                .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))
                                .onChange(of: deliveryAddress) { _, _ in deliveryQuote = nil }
                            Button {
                                Task {
                                    isQuotingDelivery = true
                                    defer { isQuotingDelivery = false }
                                    deliveryQuote = await supabase.quoteDelivery(address: deliveryAddress.trimmingCharacters(in: .whitespacesAndNewlines))
                                }
                            } label: {
                                HStack(spacing: 7) {
                                    if isQuotingDelivery { ProgressView().tint(MinervaColor.emeraldDark) }
                                    Text(isQuotingDelivery ? "Calcul en cours…" : "Calculer le prix et le délai")
                                }
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(MinervaColor.emeraldDark)
                            }
                            .disabled(isQuotingDelivery || deliveryAddress.trimmingCharacters(in: .whitespacesAndNewlines).count < 6)
                            if let deliveryQuote {
                                Text("\(String(format: "%.2f $", deliveryQuote.fee)) · environ \(deliveryQuote.etaMinutes ?? 0) min · \(deliveryQuote.distanceKm.map { String(format: "%.1f km", $0) } ?? "distance confirmée")")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(MinervaColor.emeraldDark)
                            }
                        }
                    }
                    .padding(14)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                } else if pickupEnabled {
                    Text("Cueillette sur place")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                if checkoutAvailable {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Mode de paiement")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(MinervaColor.inkSoft)
                        if canPayAtReceipt && canPayOnline {
                            HStack(spacing: 8) {
                                paymentChoice("À la réception", selected: !payOnline) { payOnline = false }
                                paymentChoice("En ligne", selected: payOnline) { payOnline = true }
                            }
                        } else if canPayOnline {
                            Text("Paiement en ligne sécurisé par Stripe")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(MinervaColor.emeraldDark)
                        } else {
                            Text("Paiement à la réception")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(MinervaColor.inkSoft)
                            TextField("", text: $paymentMethod, prompt: Text("Carte, comptant…").foregroundStyle(MinervaColor.inkFaint))
                                .padding(12)
                                .background(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 11))
                                .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))
                        }
                        if canPayOnline && payOnline {
                            Text("La commande est confirmée après validation du paiement.")
                                .font(.system(size: 10.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }
                    }
                } else {
                    Text("La cueillette, la livraison ou le paiement des commandes ne sont pas encore configurés par ce restaurant.")
                        .font(.system(size: 12))
                        .foregroundStyle(.red)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                VStack(alignment: .leading, spacing: 8) {
                    Toggle("Planifier cette commande", isOn: $isScheduled)
                        .font(.system(size: 13, weight: .semibold))
                        .tint(MinervaColor.emerald)
                    if isScheduled {
                        DatePicker(
                            "Prêt le",
                            selection: $requestedReadyAt,
                            in: Date().addingTimeInterval(15 * 60)...Date().addingTimeInterval(30 * 24 * 60 * 60),
                            displayedComponents: [.date, .hourAndMinute]
                        )
                        .datePickerStyle(.compact)
                        .environment(\.timeZone, supabase.restaurantTimezone)
                        Text("Heure du restaurant · créneaux de 15 minutes · jusqu’à 30 jours.")
                            .font(.system(size: 10.5))
                            .foregroundStyle(MinervaColor.inkFaint)
                    }
                }
                .padding(14)
                .background(MinervaColor.creamSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                if status == .error {
                    Text("La commande a échoué. Réessayez.")
                        .font(.system(size: 12.5))
                        .foregroundStyle(.red)
                }

                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        if status == .submitting { ProgressView().tint(.white) }
                        Text(status == .submitting ? "Envoi…" : "Envoyer la commande (\(String(format: "%.2f $", total)))")
                            .font(.system(size: 14.5, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                }
                .background(MinervaColor.emerald)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .buttonStyle(PressableButtonStyle())
                .disabled(status == .submitting || !checkoutAvailable || (deliverySelected && deliveryQuote == nil))
            }
            .padding(18)
        }
    }

    private func totalRow(_ label: String, _ amount: Double, emphasized: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: emphasized ? 14 : 12.5, weight: emphasized ? .semibold : .regular))
            Spacer()
            Text(String(format: "%.2f $", amount))
                .font(.system(size: emphasized ? 15 : 12.5, weight: emphasized ? .bold : .medium))
        }
        .foregroundStyle(emphasized ? MinervaColor.ink : MinervaColor.inkSoft)
    }

    private var doneState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(MinervaColor.emeraldDark)
            Text("Commande envoyée")
                .font(MinervaFont.display(22))
                .foregroundStyle(MinervaColor.ink)
            Text(payOnline ? "Ouvrez le paiement sécurisé pour confirmer votre commande. Le restaurant reçoit la confirmation après vérification du paiement." : "Le restaurant a reçu votre commande. Vous paierez à la réception.")
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 30)

            if let paymentURL {
                Button { openURL(paymentURL) } label: {
                    Label("Payer en ligne avec Stripe", systemImage: "lock.fill")
                        .font(.system(size: 13.5, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                }
                .foregroundStyle(.white)
                .background(MinervaColor.emerald)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)
            }

            if let estimatedReadyAt {
                Text("Prêt vers \(estimatedReadyAt.formatted(date: .omitted, time: .shortened))")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }

            if let mapsUrlString = googleMapsUrl, let url = URL(string: mapsUrlString) {
                Link(destination: url) {
                    HStack(spacing: 8) {
                        Image(systemName: "star.fill")
                        Text("Laisser un avis Google")
                    }
                    .font(.system(size: 13.5, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .foregroundStyle(MinervaColor.emeraldDark)
                .background(MinervaColor.emerald.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 24)
            }

            Spacer()
            Button("Fermer") {
                onOrdered()
                dismiss()
            }
            .font(.system(size: 14.5, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(MinervaColor.emerald)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .buttonStyle(PressableButtonStyle())
            .padding(.horizontal, 24)
        }
    }

    private func submit() async {
        status = .submitting
        let cartDict = Dictionary(uniqueKeysWithValues: lines.map { ($0.item.id, $0.quantity) })
        let result = await supabase.submitOrder(
            cart: cartDict,
            tipAmount: tipAmount,
            paymentMethod: payOnline || paymentMethod.isEmpty ? nil : paymentMethod,
            requestedReadyAt: isScheduled ? requestedReadyAt : nil,
            payOnline: payOnline,
            delivery: deliverySelected ? .init(address: deliveryAddress.trimmingCharacters(in: .whitespacesAndNewlines)) : nil
        )
        let generator = UINotificationFeedbackGenerator()
        if result.ok {
            estimatedReadyAt = result.estimatedReadyAt
            paymentURL = result.paymentURL
            generator.notificationOccurred(.success)
            status = .done
        } else {
            generator.notificationOccurred(.error)
            status = .error
        }
    }

    private func paymentChoice(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .foregroundStyle(selected ? MinervaColor.emeraldDark : MinervaColor.inkSoft)
                .background(selected ? MinervaColor.emerald.opacity(0.12) : .white)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(selected ? MinervaColor.emerald : MinervaColor.border))
        }
        .buttonStyle(.plain)
    }
}

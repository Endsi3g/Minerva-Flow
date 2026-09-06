import SwiftUI

/// Full menu item page — photo carousel, rating, description/ingredients,
/// reviews, and a "more like this" carousel of related items in the same
/// category, matching the Google-Maps-style depth requested: this is the
/// page a menu item's name links to everywhere in the app (Commander,
/// RestaurantDetailView, MyCardView), not a modal or a sheet, so it can be
/// pushed onto and popped off any of those navigation stacks.
struct MenuItemDetailView: View {
    let item: NativeMenuItem
    let restaurantId: String
    let allItemsInCategory: [NativeMenuItem]
    /// Only set when reached from the Commander tab's own menu (see
    /// CategoryItemListView) — ordering only works at the restaurant the
    /// customer is actually a loyalty member of, so a menu item browsed
    /// from RestaurantDetailView's cross-restaurant discovery has no cart
    /// to add into yet (nil here), and the action button reflects that
    /// honestly instead of pretending to add to an order that can't be
    /// placed.
    var cart: Binding<[String: Int]>? = nil

    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    @State private var reviews: [MenuItemReview] = []
    @State private var isLoadingReviews = true
    @State private var showReviewSheet = false
    @State private var carouselIndex = 0

    private var relatedItems: [NativeMenuItem] {
        allItemsInCategory.filter { $0.id != item.id }
    }

    private var averageRating: Double {
        guard !reviews.isEmpty else { return 0 }
        return Double(reviews.map(\.rating).reduce(0, +)) / Double(reviews.count)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                carousel

                VStack(alignment: .leading, spacing: 20) {
                    titleBlock

                    actionButtons

                    if let description = item.description {
                        descriptionSection(description)
                    }

                    reviewsSection

                    if !relatedItems.isEmpty {
                        relatedSection
                    }
                }
                .padding(18)
            }
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(item.name)
                    .font(.system(size: 15, weight: .semibold))
                    .lineLimit(1)
            }
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: shareText) {
                    Image(systemName: "square.and.arrow.up")
                }
                .accessibilityLabel("Partager")
            }
        }
        .sheet(isPresented: $showReviewSheet) {
            WriteReviewSheet(item: item, restaurantId: restaurantId) { newAverage in
                Task { await loadReviews() }
            }
        }
        .task { await loadReviews() }
        .onAppear {
            // Only for items reachable from the customer's own Commander
            // cart (cart != nil) — browsing a restaurant one isn't a member
            // of yet has no order to remind anyone to finish. Skip entirely
            // if it's already in the cart — no reminder needed for
            // something already acted on.
            if let cart, (cart.wrappedValue[item.id] ?? 0) == 0 {
                NotificationManager.shared.scheduleMenuViewReminder(itemName: item.name, restaurantName: supabase.restaurantName ?? "votre restaurant")
            }
        }
    }

    // MARK: - Carousel

    private var carousel: some View {
        let images = item.galleryImageURLs
        return Group {
            if images.isEmpty {
                ZStack {
                    Rectangle().fill(MinervaColor.ink.opacity(0.06))
                    Image(systemName: "fork.knife")
                        .font(.system(size: 40))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                .frame(height: 260)
            } else {
                TabView(selection: $carouselIndex) {
                    ForEach(Array(images.enumerated()), id: \.offset) { index, urlString in
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
                .tabViewStyle(.page(indexDisplayMode: images.count > 1 ? .always : .never))
                .frame(height: 260)
            }
        }
    }

    // MARK: - Title / rating / price

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(item.name)
                .font(MinervaFont.display(24))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 10) {
                if !reviews.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(MinervaColor.limeAccent)
                        Text(String(format: "%.1f", averageRating))
                            .font(.system(size: 13, weight: .bold))
                        Text("(\(reviews.count) avis)")
                            .font(.system(size: 12))
                            .foregroundStyle(MinervaColor.inkFaint)
                    }
                } else if !isLoadingReviews {
                    Text("Aucun avis pour l'instant")
                        .font(.system(size: 12))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                Spacer()
                Text(String(format: "%.2f $", item.price))
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }
        }
    }

    private var actionButtons: some View {
        HStack(spacing: 10) {
            if let cart {
                addToCartControl(cart)
            } else {
                // Reached from cross-restaurant discovery, not the
                // Commander tab — ordering only works at the restaurant
                // the customer is actually a member of, so this is
                // honestly informational, not a broken "add to cart".
                HStack(spacing: 6) {
                    Image(systemName: "info.circle")
                    Text("Devenez client de ce restaurant pour commander")
                        .fixedSize(horizontal: false, vertical: true)
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(MinervaColor.inkSoft)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(MinervaColor.creamSoft)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Button {
                showReviewSheet = true
            } label: {
                Image(systemName: "star.bubble")
                    .font(.system(size: 15))
                    .frame(width: 46, height: 44)
            }
            .foregroundStyle(MinervaColor.emeraldDark)
            .background(MinervaColor.emerald.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .buttonStyle(PressableButtonStyle())
            .accessibilityLabel("Écrire un avis")
        }
    }

    /// A real add-to-cart control — quantity in, quantity out of the same
    /// cart Commander's checkout reads from, not a button that only
    /// dismisses the page and hopes the user remembers to also tap + on
    /// the list row underneath.
    private func addToCartControl(_ cart: Binding<[String: Int]>) -> some View {
        let quantity = cart.wrappedValue[item.id] ?? 0
        return HStack(spacing: 12) {
            if quantity > 0 {
                Button {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    cart.wrappedValue[item.id] = max(0, quantity - 1)
                } label: {
                    Image(systemName: "minus.circle.fill").font(.system(size: 24))
                }
                .foregroundStyle(MinervaColor.inkSoft)
                .buttonStyle(PressableButtonStyle())
                .accessibilityLabel("Retirer un \(item.name)")

                Text("\(quantity)")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(MinervaColor.ink)
                    .frame(minWidth: 18)
            }

            Button {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                cart.wrappedValue[item.id] = quantity + 1
                if quantity == 0 {
                    NotificationManager.shared.cancelMenuViewReminder(itemName: item.name)
                    dismiss()
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "cart.fill")
                    Text(quantity > 0 ? "Ajouté" : "Ajouter au panier")
                }
                .font(.system(size: 13.5, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
            .foregroundStyle(.white)
            .background(MinervaColor.emerald)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .buttonStyle(PressableButtonStyle())
        }
    }

    private func descriptionSection(_ description: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Description")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            Text(description)
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - Reviews

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Avis clients")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                Spacer()
                Button("Laisser un avis") { showReviewSheet = true }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }

            if isLoadingReviews {
                Skeletons.list(count: 2)
            } else if reviews.isEmpty {
                Text("Soyez le premier à donner votre avis sur ce plat.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
            } else {
                ForEach(reviews.prefix(5)) { review in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 2) {
                            ForEach(0..<5, id: \.self) { i in
                                Image(systemName: i < review.rating ? "star.fill" : "star")
                                    .font(.system(size: 10))
                                    .foregroundStyle(MinervaColor.limeAccent)
                            }
                            Spacer()
                            Text(review.createdAt.formatted(date: .abbreviated, time: .omitted))
                                .font(.system(size: 10.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }
                        if let comment = review.comment, !comment.isEmpty {
                            Text(comment)
                                .font(.system(size: 12.5))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .padding(12)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private func loadReviews() async {
        isLoadingReviews = true
        reviews = await supabase.fetchReviews(forMenuItem: item.id)
        isLoadingReviews = false
    }

    // MARK: - Related items

    private var relatedSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Vous aimerez aussi")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(relatedItems) { related in
                        NavigationLink {
                            MenuItemDetailView(item: related, restaurantId: restaurantId, allItemsInCategory: allItemsInCategory, cart: cart)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                ZStack {
                                    Rectangle().fill(MinervaColor.ink.opacity(0.06))
                                    Image(systemName: "fork.knife").foregroundStyle(MinervaColor.inkFaint)
                                }
                                .frame(width: 140, height: 90)
                                .clipShape(RoundedRectangle(cornerRadius: 12))

                                Text(related.name)
                                    .font(.system(size: 12.5, weight: .medium))
                                    .foregroundStyle(MinervaColor.ink)
                                    .lineLimit(1)
                                Text(String(format: "%.2f $", related.price))
                                    .font(.system(size: 11.5, weight: .semibold))
                                    .foregroundStyle(MinervaColor.emeraldDark)
                            }
                            .frame(width: 140, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var shareText: String {
        "\(item.name) — \(String(format: "%.2f $", item.price)) sur Minerva Flow"
    }
}

/// ShareLink already covers Messages, AirDrop, and every installed social
/// app via the system share sheet — no per-network integration code
/// needed, that's the entire point of using it instead of hand-rolling
/// individual share buttons.
private struct WriteReviewSheet: View {
    let item: NativeMenuItem
    let restaurantId: String
    let onSubmitted: (Double) -> Void

    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @State private var rating = 5
    @State private var comment = ""
    @State private var isSubmitting = false
    @State private var submitError: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text(item.name)
                    .font(MinervaFont.display(18))
                    .foregroundStyle(MinervaColor.ink)

                HStack(spacing: 8) {
                    ForEach(1...5, id: \.self) { star in
                        Button {
                            rating = star
                        } label: {
                            Image(systemName: star <= rating ? "star.fill" : "star")
                                .font(.system(size: 28))
                                .foregroundStyle(MinervaColor.limeAccent)
                        }
                    }
                }

                TextField("Votre commentaire (optionnel)", text: $comment, axis: .vertical)
                    .lineLimit(4, reservesSpace: true)
                    .padding(12)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                    .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))

                if let submitError {
                    Text(submitError)
                        .font(.system(size: 12.5))
                        .foregroundStyle(.red)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        if isSubmitting { ProgressView().tint(.white) }
                        Text(isSubmitting ? "Envoi…" : "Publier mon avis")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                }
                .background(MinervaColor.emerald)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .buttonStyle(PressableButtonStyle())
                .disabled(isSubmitting)

                Spacer()
            }
            .padding(20)
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Laisser un avis")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        submitError = nil
        let ok = await supabase.submitReview(menuItemId: item.id, restaurantId: restaurantId, rating: rating, comment: comment.isEmpty ? nil : comment)
        isSubmitting = false
        if ok {
            onSubmitted(Double(rating))
            dismiss()
        } else {
            submitError = "L'envoi de votre avis a échoué. Réessayez."
        }
    }
}

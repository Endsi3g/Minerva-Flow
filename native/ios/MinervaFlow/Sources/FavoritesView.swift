import SwiftUI

/// "Mes favoris" — reached from Profile. Lists every menu item and offer
/// the customer has hearted (MenuView, MenuItemDetailView, OfferDetailView),
/// cross-referenced against the already-loaded supabase.menuItems/offers.
/// A favorited offer that's no longer active/live won't appear here (it's
/// filtered out of supabase.offers at the source, see loadPortalData) —
/// an acceptable gap rather than a second fetch just for stale favorites.
struct FavoritesView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @State private var hasLoadedMenu = false
    @State private var openOffer: Offer?

    private var favoriteItems: [NativeMenuItem] {
        let ids = Set(supabase.customer?.favoriteMenuItemIds ?? [])
        return supabase.menuItems.filter { ids.contains($0.id) }
    }

    private var favoriteOffers: [Offer] {
        let ids = Set(supabase.customer?.favoriteOfferIds ?? [])
        return supabase.offers.filter { ids.contains($0.id) }
    }

    private var isEmpty: Bool { favoriteItems.isEmpty && favoriteOffers.isEmpty }

    var body: some View {
        NavigationStack {
            Group {
                if supabase.isLoadingMenu && !hasLoadedMenu {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            Skeletons.list(count: 3)
                        }
                        .padding(18)
                    }
                } else if isEmpty {
                    emptyState
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 22) {
                            if !favoriteItems.isEmpty {
                                itemsSection
                            }
                            if !favoriteOffers.isEmpty {
                                offersSection
                            }
                        }
                        .padding(18)
                    }
                }
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Mes favoris")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
            .task {
                guard !hasLoadedMenu else { return }
                hasLoadedMenu = true
                if supabase.menuItems.isEmpty { await supabase.fetchMenu() }
            }
            .sheet(item: $openOffer) { offer in
                OfferDetailView(offer: offer)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "heart")
                .font(.system(size: 36))
                .foregroundStyle(MinervaColor.inkFaint)
            Text("Aucun favori pour l'instant")
                .font(MinervaFont.display(18))
                .foregroundStyle(MinervaColor.ink)
            Text("Appuyez sur le cœur d'un plat ou d'une offre pour le retrouver ici.")
                .font(.system(size: 12.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var itemsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Plats")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 10) {
                ForEach(favoriteItems) { item in
                    favoriteItemRow(item)
                }
            }
        }
    }

    private func favoriteItemRow(_ item: NativeMenuItem) -> some View {
        HStack(spacing: 12) {
            ZStack {
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
            }
            .frame(width: 56, height: 56)
            .clipped()

            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(String(format: "%.2f $", item.price))
                    .font(.system(size: 12.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }

            Spacer(minLength: 8)

            unfavoriteButton {
                await supabase.toggleFavoriteMenuItem(item.id, favorite: false)
            }
        }
        .padding(12)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var offersSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Offres")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 10) {
                ForEach(favoriteOffers) { offer in
                    Button {
                        openOffer = offer
                    } label: {
                        favoriteOfferRow(offer)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func favoriteOfferRow(_ offer: Offer) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 12).fill(MinervaColor.emerald.opacity(0.12))
                if let urlString = offer.imageUrl, let url = URL(string: urlString) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else {
                            Image(systemName: "tag.fill").foregroundStyle(MinervaColor.emerald)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    Image(systemName: "tag.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(MinervaColor.emerald)
                }
            }
            .frame(width: 56, height: 56)
            .clipped()

            VStack(alignment: .leading, spacing: 2) {
                Text(offer.title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if let price = offer.price {
                    Text(String(format: "%.2f $", price))
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
            }

            Spacer(minLength: 8)

            unfavoriteButton {
                await supabase.toggleFavoriteOffer(offer.id, favorite: false)
            }
        }
        .padding(12)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func unfavoriteButton(_ action: @escaping () async -> Void) -> some View {
        Button {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            Task { await action() }
        } label: {
            Image(systemName: "heart.fill")
                .font(.system(size: 16))
                .foregroundStyle(.red)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Retirer des favoris")
    }
}

import SwiftUI

/// "Mes favoris": one card per establishment the customer belongs to, with the
/// dishes and offers saved there. Pushed inside Compte › Autre (it has no
/// NavigationStack of its own). Hearts can be removed at the home
/// establishment, whose data is already loaded; other establishments are
/// shown read-only.
struct FavoritesView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var establishments: [EstablishmentFavorites] = []
    @State private var isLoading = true
    @State private var openOffer: Offer?
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    private var totalSaved: Int { establishments.reduce(0) { $0 + $1.savedCount } }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(isFrench ? "Mes favoris" : "My favourites")
                        .font(MinervaFont.display(30, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .accessibilityAddTraits(.isHeader)
                    Text(isFrench ? "Une carte par établissement." : "One card per establishment.")
                        .font(.system(size: 14))
                        .foregroundStyle(MinervaColor.inkSoft)
                }

                if isLoading && establishments.isEmpty {
                    Skeletons.list(count: 3)
                } else if establishments.isEmpty {
                    emptyState
                } else {
                    if totalSaved == 0 { emptyHint }
                    ForEach(establishments) { card($0) }
                }
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Mes favoris" : "My favourites")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .sheet(item: $openOffer) { OfferDetailView(offer: $0) }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        if supabase.allMemberships.isEmpty { await supabase.fetchAllMemberships() }
        if supabase.menuItems.isEmpty { await supabase.fetchMenu() }
        establishments = await supabase.loadFavoritesByEstablishment()
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "heart").font(.system(size: 36)).foregroundStyle(MinervaColor.inkFaint)
            Text(isFrench ? "Aucun établissement" : "No establishment yet")
                .font(MinervaFont.display(18)).foregroundStyle(MinervaColor.ink)
            Text(isFrench ? "Rejoignez un restaurant pour y enregistrer vos plats et offres préférés." : "Join a restaurant to save your favourite dishes and offers.")
                .font(.system(size: 12.5)).foregroundStyle(MinervaColor.inkSoft).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.top, 40)
    }

    private var emptyHint: some View {
        Text(isFrench ? "Appuyez sur le cœur d'un plat ou d'une offre pour le retrouver ici." : "Tap the heart on a dish or offer to find it here.")
            .font(.system(size: 12.5))
            .foregroundStyle(MinervaColor.inkSoft)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MinervaColor.emerald.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func card(_ establishment: EstablishmentFavorites) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "storefront.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 34, height: 34)
                    .background(MinervaColor.emerald)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(establishment.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .lineLimit(2)
                    Text(summary(establishment))
                        .font(.system(size: 12))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                Spacer(minLength: 8)
                if establishment.savedCount > 0 {
                    Text("\(establishment.savedCount)")
                        .font(.system(size: 12.5, weight: .bold, design: .rounded))
                        .foregroundStyle(.red)
                        .padding(.horizontal, 9).padding(.vertical, 4)
                        .background(Color.red.opacity(0.1))
                        .clipShape(Capsule())
                        .accessibilityLabel(isFrench ? "\(establishment.savedCount) favoris" : "\(establishment.savedCount) favourites")
                }
            }
            .padding(14)

            if establishment.savedCount == 0 {
                CompteSeparator()
                Text(isFrench ? "Aucun favori ici pour l'instant." : "No favourites here yet.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(14)
            } else if establishment.loadFailed && establishment.items.isEmpty && establishment.offers.isEmpty {
                CompteSeparator()
                Text(isFrench ? "Détails indisponibles pour le moment. Tirez pour réessayer." : "Details unavailable right now. Pull to retry.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(14)
            } else {
                ForEach(establishment.items) { item in
                    CompteSeparator()
                    itemRow(item, editable: establishment.isHome)
                }
                ForEach(establishment.offers) { offer in
                    CompteSeparator()
                    offerRow(offer, editable: establishment.isHome)
                }
            }
        }
        .background(MinervaColor.creamSoft)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MinervaColor.border, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private func summary(_ establishment: EstablishmentFavorites) -> String {
        let dishes = establishment.items.count, offers = establishment.offers.count
        if establishment.savedCount == 0 { return isFrench ? "Carte fidélité active" : "Active loyalty card" }
        if dishes + offers == 0 { return isFrench ? "\(establishment.savedCount) enregistrés" : "\(establishment.savedCount) saved" }
        return isFrench
            ? "\(dishes) plat\(dishes > 1 ? "s" : "") · \(offers) offre\(offers > 1 ? "s" : "")"
            : "\(dishes) dish\(dishes == 1 ? "" : "es") · \(offers) offer\(offers == 1 ? "" : "s")"
    }

    private func thumbnail(url: String?, symbol: String, tint: Color) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10).fill(tint.opacity(0.12))
            if let url, let parsed = URL(string: url) {
                AsyncImage(url: parsed) { phase in
                    if let image = phase.image { image.resizable().scaledToFill() }
                    else { Image(systemName: symbol).foregroundStyle(tint) }
                }
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                Image(systemName: symbol).font(.system(size: 16)).foregroundStyle(tint)
            }
        }
        .frame(width: 48, height: 48)
        .clipped()
        .accessibilityHidden(true)
    }

    private func itemRow(_ item: NativeMenuItem, editable: Bool) -> some View {
        HStack(spacing: 12) {
            thumbnail(url: item.galleryImageURLs.first, symbol: "fork.knife", tint: MinervaColor.inkFaint)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name).font(.system(size: 14, weight: .medium)).foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(String(format: "%.2f $", item.price))
                    .font(.system(size: 12.5, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark)
            }
            Spacer(minLength: 8)
            if editable {
                unfavoriteButton { await supabase.toggleFavoriteMenuItem(item.id, favorite: false); await load() }
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }

    private func offerRow(_ offer: Offer, editable: Bool) -> some View {
        Button { openOffer = offer } label: {
            HStack(spacing: 12) {
                thumbnail(url: offer.imageUrl, symbol: "tag.fill", tint: MinervaColor.emerald)
                VStack(alignment: .leading, spacing: 2) {
                    Text(offer.title).font(.system(size: 14, weight: .medium)).foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    if let price = offer.price {
                        Text(String(format: "%.2f $", price))
                            .font(.system(size: 12.5, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark)
                    }
                }
                Spacer(minLength: 8)
                if editable {
                    unfavoriteButton { await supabase.toggleFavoriteOffer(offer.id, favorite: false); await load() }
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func unfavoriteButton(_ action: @escaping () async -> Void) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            Task { await action() }
        } label: {
            Image(systemName: "heart.fill").font(.system(size: 16)).foregroundStyle(.red).frame(width: 36, height: 36)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isFrench ? "Retirer des favoris" : "Remove from favourites")
    }
}

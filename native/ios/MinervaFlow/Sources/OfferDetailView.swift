import SwiftUI

/// An offer's own dedicated page, reached from Home's "En ce moment" feed
/// and from Rewards' offers catalog — full details instead of only a promo
/// card that jumps straight into ordering: image, price, what's included
/// and what isn't (owner-configurable, see 0071_offer_price_and_inclusions.sql),
/// and native sharing.
struct OfferDetailView: View {
    let offer: Offer
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @State private var relatedOffer: Offer?

    /// Every other active offer at this restaurant — "plusieurs autres
    /// offres" below the fold, browsable the same way this very page was
    /// reached, instead of the customer having to back out to find them.
    private var otherOffers: [Offer] {
        supabase.offers.filter { $0.id != offer.id }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .topTrailing) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        headerImage

                        VStack(alignment: .leading, spacing: 20) {
                            titleBlock

                            if !offer.includedItems.isEmpty || !offer.excludedItems.isEmpty {
                                inclusionsSection
                            }

                            if let description = offer.description {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Détails de l'offre")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(MinervaColor.ink)
                                    Text(description)
                                        .font(.system(size: 13.5))
                                        .foregroundStyle(MinervaColor.inkSoft)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }

                            if let restaurantName = supabase.restaurantName {
                                HStack(spacing: 8) {
                                    Image(systemName: "storefront.fill")
                                    Text("Valide chez \(restaurantName)")
                                }
                                .font(.system(size: 12.5))
                                .foregroundStyle(MinervaColor.inkSoft)
                            }

                            HStack(spacing: 10) {
                                Button {
                                    dismiss()
                                } label: {
                                    HStack(spacing: 6) {
                                        Image(systemName: "cart.fill")
                                        Text("Aller commander")
                                    }
                                    .font(.system(size: 14, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 13)
                                }
                                .foregroundStyle(.white)
                                .background(MinervaColor.emerald)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .buttonStyle(PressableButtonStyle())

                                ShareLink(item: shareText) {
                                    Image(systemName: "square.and.arrow.up")
                                        .font(.system(size: 15))
                                        .frame(width: 48, height: 48)
                                }
                                .foregroundStyle(MinervaColor.emeraldDark)
                                .background(MinervaColor.emerald.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .accessibilityLabel("Partager")
                            }

                            if !otherOffers.isEmpty {
                                otherOffersSection
                            }
                        }
                        .padding(18)
                    }
                }
                .background(MinervaColor.cream.ignoresSafeArea())
                .ignoresSafeArea(edges: .top)

                closeButton
                    .padding(.top, 10)
                    .padding(.trailing, 16)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .sheet(item: $relatedOffer) { other in
                OfferDetailView(offer: other)
            }
        }
    }

    /// Floats directly on the image instead of sitting in a separate
    /// toolbar strip above it, so the image itself can run edge-to-edge —
    /// the translucent dark circle keeps it legible over any photo.
    private var closeButton: some View {
        Button {
            dismiss()
        } label: {
            Image(systemName: "xmark")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(.black.opacity(0.35))
                .clipShape(Circle())
        }
        .accessibilityLabel("Fermer")
    }

    private var headerImage: some View {
        Group {
            if let urlString = offer.imageUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        offerImageFallback
                    }
                }
            } else {
                offerImageFallback
            }
        }
        .frame(height: 340)
        .clipped()
    }

    /// Horizontal, tap-to-browse — the "comme dans le menu" precedent this
    /// was explicitly asked to mirror, not a plain list.
    private var otherOffersSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Plusieurs autres offres")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(otherOffers) { other in
                        Button {
                            relatedOffer = other
                        } label: {
                            otherOfferCard(other)
                        }
                        .buttonStyle(PressableButtonStyle())
                    }
                }
            }
            .horizontalEdgeFade()
        }
    }

    private func otherOfferCard(_ other: Offer) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Group {
                if let urlString = other.imageUrl, let url = URL(string: urlString) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else {
                            otherOfferImageFallback
                        }
                    }
                } else {
                    otherOfferImageFallback
                }
            }
            .frame(width: 170, height: 96)
            .clipped()

            VStack(alignment: .leading, spacing: 2) {
                Text(other.title)
                    .font(.system(size: 12.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                    .lineLimit(1)
                if let price = other.price {
                    Text(String(format: "%.2f $", price))
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
            }
            .padding(10)
        }
        .frame(width: 170, alignment: .leading)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: MinervaColor.ink.opacity(0.08), radius: 8, x: 0, y: 3)
    }

    private var otherOfferImageFallback: some View {
        ZStack {
            MinervaColor.emerald
            Image(systemName: "tag.fill")
                .font(.system(size: 18))
                .foregroundStyle(.white.opacity(0.5))
        }
    }

    private var offerImageFallback: some View {
        ZStack {
            MinervaColor.emerald
            Image(systemName: "tag.fill")
                .font(.system(size: 36))
                .foregroundStyle(.white.opacity(0.5))
        }
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                if offer.isLive {
                    Text("EN COURS")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(0.5)
                        .foregroundStyle(MinervaColor.emeraldDark)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(MinervaColor.emerald.opacity(0.12))
                        .clipShape(Capsule())
                }
                if let range = dateRangeText {
                    Text(range)
                        .font(.system(size: 11.5))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
            }

            HStack(alignment: .top) {
                Text(offer.title)
                    .font(MinervaFont.display(24))
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 8)
                if let price = offer.price {
                    Text(String(format: "%.2f $", price))
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
            }
        }
    }

    private var inclusionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if !offer.includedItems.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Ce qui est inclus")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    ForEach(offer.includedItems, id: \.self) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 13))
                                .foregroundStyle(MinervaColor.emerald)
                            Text(item)
                                .font(.system(size: 13))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
            if !offer.excludedItems.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Ce qui n'est pas inclus")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    ForEach(offer.excludedItems, id: \.self) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 13))
                                .foregroundStyle(MinervaColor.inkFaint)
                            Text(item)
                                .font(.system(size: 13))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
        }
        .padding(14)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var shareText: String {
        let restaurant = supabase.restaurantName.map { " chez \($0)" } ?? ""
        return "\(offer.title)\(restaurant) — découvrez cette offre sur Minerva Flow."
    }

    private var dateRangeText: String? {
        guard offer.startsAt != nil || offer.endsAt != nil else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.locale = Locale(identifier: "fr_CA")
        if let starts = offer.startsAt, let ends = offer.endsAt {
            return "Du \(formatter.string(from: starts)) au \(formatter.string(from: ends))"
        } else if let ends = offer.endsAt {
            return "Jusqu'au \(formatter.string(from: ends))"
        } else if let starts = offer.startsAt {
            return "À partir du \(formatter.string(from: starts))"
        }
        return nil
    }
}

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

    var body: some View {
        NavigationStack {
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
                    }
                    .padding(18)
                }
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
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
        .frame(height: 200)
        .clipped()
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

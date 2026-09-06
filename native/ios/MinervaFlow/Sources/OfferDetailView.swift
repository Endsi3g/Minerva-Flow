import SwiftUI

/// An offer's own dedicated page, reached from Home's "En ce moment" feed
/// and from Rewards' offers catalog — full details instead of only a promo
/// card that jumps straight into ordering. Offers in this schema are
/// promotional copy tied to a date range, not a fixed line item (no
/// structured price/inclusions columns exist), so this presents exactly
/// what the restaurant actually configured rather than inventing fields
/// that don't exist yet.
struct OfferDetailView: View {
    let offer: Offer
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 8) {
                            Image(systemName: "tag.fill")
                                .font(.system(size: 16))
                            if offer.isLive {
                                Text("EN COURS")
                                    .font(.system(size: 10, weight: .bold))
                                    .tracking(0.5)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(.white.opacity(0.25))
                                    .clipShape(Capsule())
                            }
                        }
                        Text(offer.title)
                            .font(MinervaFont.display(24))
                            .fixedSize(horizontal: false, vertical: true)

                        if let range = dateRangeText {
                            Text(range)
                                .font(.system(size: 12))
                                .opacity(0.85)
                        }
                    }
                    .foregroundStyle(.white)
                    .padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MinervaColor.emerald)
                    .clipShape(RoundedRectangle(cornerRadius: 20))

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
                }
                .padding(18)
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

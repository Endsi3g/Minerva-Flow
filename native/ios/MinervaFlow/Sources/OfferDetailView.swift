import SwiftUI
import PhotosUI

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
    @State private var reviews: [OfferReview] = []
    @State private var isLoadingReviews = true
    @State private var showReviewSheet = false

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

                            reviewsSection

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
            .sheet(isPresented: $showReviewSheet) {
                WriteOfferReviewSheet(offer: offer) {
                    Task { await loadReviews() }
                }
            }
            .task { await loadReviews() }
        }
    }

    // MARK: - Reviews (structural copy of MenuItemDetailView's pattern)

    private var averageRating: Double {
        guard !reviews.isEmpty else { return 0 }
        return Double(reviews.map(\.rating).reduce(0, +)) / Double(reviews.count)
    }

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Avis clients")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                if !reviews.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 11))
                        Text(String(format: "%.1f", averageRating))
                        Text("(\(reviews.count))")
                            .foregroundStyle(MinervaColor.inkFaint)
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                }
                Spacer()
                Button("Laisser un avis") { showReviewSheet = true }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }

            if isLoadingReviews {
                Skeletons.list(count: 2)
            } else if reviews.isEmpty {
                Text("Soyez le premier à donner votre avis sur cette offre.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
            } else {
                ForEach(reviews.prefix(5)) { review in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 2) {
                            ForEach(0..<5, id: \.self) { i in
                                Image(systemName: i < review.rating ? "star.fill" : "star")
                                    .font(.system(size: 10))
                            }
                            Spacer()
                            Text(review.createdAt.formatted(date: .abbreviated, time: .omitted))
                                .font(.system(size: 10.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }
                        .foregroundStyle(MinervaColor.emerald)
                        if let comment = review.comment, !comment.isEmpty {
                            Text(comment)
                                .font(.system(size: 12.5))
                                .foregroundStyle(MinervaColor.inkSoft)
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
                                        .frame(width: 64, height: 64)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                    }
                                }
                            }
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
        reviews = await supabase.fetchOfferReviews(offerId: offer.id)
        isLoadingReviews = false
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

/// Structural copy of MenuItemDetailView's own WriteReviewSheet, targeting
/// offer_reviews instead of menu_item_reviews.
private struct WriteOfferReviewSheet: View {
    let offer: Offer
    let onSubmitted: () -> Void

    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @State private var rating = 5
    @State private var comment = ""
    @State private var photoItems: [PhotosPickerItem] = []
    @State private var photoPreviews: [UIImage] = []
    @State private var isSubmitting = false
    @State private var submitError: String?

    private let maxPhotos = 6

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    Text(offer.title)
                        .font(MinervaFont.display(18))
                        .foregroundStyle(MinervaColor.ink)

                    HStack(spacing: 8) {
                        ForEach(1...5, id: \.self) { star in
                            Button {
                                rating = star
                            } label: {
                                Image(systemName: star <= rating ? "star.fill" : "star")
                                    .font(.system(size: 28))
                                    .foregroundStyle(MinervaColor.emerald)
                            }
                        }
                    }

                    TextField("Votre commentaire (optionnel)", text: $comment, axis: .vertical)
                        .lineLimit(4, reservesSpace: true)
                        .padding(12)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 11))
                        .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))

                    photoPickerSection

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
                }
                .padding(20)
            }
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

    private var photoPickerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Photos (\(photoPreviews.count)/\(maxPhotos))")
                    .font(.system(size: 11.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
                Spacer()
                if photoPreviews.count < maxPhotos {
                    PhotosPicker(selection: $photoItems, maxSelectionCount: maxPhotos - photoPreviews.count, matching: .images) {
                        Label("Ajouter", systemImage: "photo.badge.plus")
                            .font(.system(size: 11.5, weight: .semibold))
                    }
                    .foregroundStyle(MinervaColor.emeraldDark)
                }
            }

            if !photoPreviews.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(photoPreviews.enumerated()), id: \.offset) { index, image in
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: image)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 72, height: 72)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                Button {
                                    photoPreviews.remove(at: index)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 15))
                                        .foregroundStyle(.white, .black.opacity(0.6))
                                }
                                .padding(3)
                            }
                        }
                    }
                }
            }
        }
        .onChange(of: photoItems) { _, newItems in
            Task { await appendPreviews(newItems) }
        }
    }

    private func appendPreviews(_ items: [PhotosPickerItem]) async {
        for item in items {
            guard photoPreviews.count < maxPhotos else { break }
            if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                photoPreviews.append(image)
            }
        }
        photoItems = []
    }

    private func submit() async {
        isSubmitting = true
        submitError = nil
        guard let restaurantId = supabase.customer?.restaurantId else {
            isSubmitting = false
            submitError = "Impossible de déterminer votre restaurant."
            return
        }

        var uploadedUrls: [String] = []
        for image in photoPreviews {
            guard let data = image.jpegData(compressionQuality: 0.8) else { continue }
            if let url = await supabase.uploadReviewImage(data) {
                uploadedUrls.append(url)
            }
        }

        let ok = await supabase.submitOfferReview(
            offerId: offer.id,
            restaurantId: restaurantId,
            rating: rating,
            comment: comment.isEmpty ? nil : comment,
            imageUrls: uploadedUrls
        )
        isSubmitting = false
        if ok {
            onSubmitted()
            dismiss()
        } else {
            submitError = "L'envoi de votre avis a échoué. Réessayez."
        }
    }
}

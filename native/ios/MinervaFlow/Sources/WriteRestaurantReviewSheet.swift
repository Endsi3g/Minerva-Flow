import SwiftUI
import PhotosUI

/// Whole-restaurant review composer — star rating, optional comment, and
/// up to 6 photos (matching the requested cap, also enforced by the DB
/// constraint). Photos upload to storage first; the review row itself
/// only ever stores the resulting URLs, same order as the web portal's
/// own upload-then-attach pattern.
struct WriteRestaurantReviewSheet: View {
    let restaurantId: String
    let restaurantName: String
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
                    Text(restaurantName)
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

        var uploadedUrls: [String] = []
        for image in photoPreviews {
            guard let data = image.jpegData(compressionQuality: 0.8) else { continue }
            if let url = await supabase.uploadReviewImage(data) {
                uploadedUrls.append(url)
            }
        }

        let ok = await supabase.submitRestaurantReview(
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

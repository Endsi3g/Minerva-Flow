import SwiftUI
import PhotosUI
import UIKit

/// Photo for a menu item or an offer: library or camera, resized and
/// compressed on the phone, uploaded to the restaurant's public image bucket
/// (`menu-item-images` or `offer-images`, writable by members only).
struct OwnerPhotoField: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let bucket: String
    let scopeId: String
    @Binding var imageURL: String?

    @State private var pickerItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var uploading = false
    @State private var errorText: String?
    private var L: Lx { Lx(storedLanguage) }

    var body: some View {
        HStack(spacing: 12) {
            preview
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        Label(L("Photo", "Photo"), systemImage: "photo.on.rectangle")
                    }
                    .buttonStyle(OwnerSecondaryButtonStyle(compact: true))
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        Button { showCamera = true } label: { Label(L("Appareil", "Camera"), systemImage: "camera") }
                            .buttonStyle(OwnerSecondaryButtonStyle(compact: true))
                    }
                    if imageURL != nil {
                        Button(role: .destructive) { imageURL = nil } label: { Image(systemName: "trash") }
                            .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.bad.color, compact: true))
                            .accessibilityLabel(Text(L("Retirer la photo", "Remove photo")))
                    }
                }
                if let errorText {
                    Text(errorText).font(.mv(size: 11.5)).foregroundStyle(OwnerTone.bad.color)
                } else {
                    Text(L("Une belle photo fait vendre : carrée, lumineuse.", "A good photo sells: square, bright.")).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkFaint)
                }
            }
            Spacer(minLength: 0)
        }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) { await upload(image) }
                else { errorText = L("Photo illisible. Essayez-en une autre.", "Unreadable photo. Try another one.") }
                pickerItem = nil
            }
        }
        .fullScreenCover(isPresented: $showCamera) {
            OwnerCameraPicker { image in
                showCamera = false
                if let image { Task { await upload(image) } }
            }
            .ignoresSafeArea()
        }
    }

    @ViewBuilder private var preview: some View {
        ZStack {
            if let imageURL, let url = URL(string: imageURL) {
                AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { MinervaColor.border }
            } else {
                MinervaColor.emerald.opacity(0.1)
                Image(systemName: "photo").font(.mv(size: 22)).foregroundStyle(MinervaColor.emeraldDark.opacity(0.6))
            }
            if uploading { Color.black.opacity(0.35); ProgressView().tint(.white) }
        }
        .frame(width: 72, height: 72)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityHidden(true)
    }

    private func upload(_ image: UIImage) async {
        guard let restaurantId = supabase.selectedOwnerRestaurantId else { return }
        uploading = true; errorText = nil
        defer { uploading = false }
        let resized = image.ownerResized(maxSide: 1400)
        guard let data = resized.jpegData(compressionQuality: 0.8) else { errorText = L("Photo illisible.", "Unreadable photo."); return }
        if let url = await supabase.uploadOwnerImage(data, bucket: bucket, restaurantId: restaurantId, scopeId: scopeId) {
            imageURL = url
        } else {
            errorText = L("L'envoi a échoué. Vérifiez votre connexion.", "Upload failed. Check your connection.")
        }
    }
}

extension UIImage {
    /// Downscales so the longest side is at most `maxSide` points of pixels.
    func ownerResized(maxSide: CGFloat) -> UIImage {
        let longest = max(size.width, size.height)
        guard longest > maxSide else { return self }
        let scale = maxSide / longest
        let target = CGSize(width: size.width * scale, height: size.height * scale)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in draw(in: CGRect(origin: .zero, size: target)) }
    }
}

struct OwnerCameraPicker: UIViewControllerRepresentable {
    let onFinish: (UIImage?) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(onFinish: onFinish) }

    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let onFinish: (UIImage?) -> Void
        init(onFinish: @escaping (UIImage?) -> Void) { self.onFinish = onFinish }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            onFinish(info[.originalImage] as? UIImage)
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { onFinish(nil) }
    }
}

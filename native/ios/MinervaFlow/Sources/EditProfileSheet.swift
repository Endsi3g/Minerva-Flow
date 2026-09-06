import SwiftUI
import PhotosUI

/// Full profile editor — photo, name, and email — reached from Profile's
/// identity card. Mirrors the web portal's own ProfileSettingsCard photo/
/// name/email editing exactly: same "avatars" storage bucket, same
/// email-change-is-a-confirmation-request (not an instant switch) model.
struct EditProfileSheet: View {
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var phone: String
    @State private var photoItem: PhotosPickerItem?
    @State private var previewImage: UIImage?
    @State private var isUploadingPhoto = false

    @State private var newEmail: String
    @State private var isEditingEmail = false
    @State private var emailStatus: EmailStatus = .idle
    @State private var emailError: String?

    @State private var isSavingName = false
    @State private var nameSaved = false
    @State private var isSavingPhone = false
    @State private var phoneSaved = false

    private enum EmailStatus: Equatable { case idle, sending, sent, error }

    init(customer: Customer) {
        _name = State(initialValue: customer.name)
        _phone = State(initialValue: customer.phone ?? "")
        _newEmail = State(initialValue: customer.email ?? "")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    photoPicker

                    savableField(
                        label: "Nom",
                        placeholder: "Votre nom",
                        text: $name,
                        isSaving: isSavingName,
                        isSaved: nameSaved,
                        disabled: name.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await saveName() }
                    }

                    emailSection

                    savableField(
                        label: "Téléphone",
                        placeholder: "514 555-0123",
                        text: $phone,
                        isSaving: isSavingPhone,
                        isSaved: phoneSaved,
                        keyboardType: .phonePad,
                        disabled: false
                    ) {
                        Task { await savePhone() }
                    }
                }
                .padding(20)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Modifier le profil")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }

    // MARK: - Photo

    private var photoPicker: some View {
        PhotosPicker(selection: $photoItem, matching: .images) {
            ZStack(alignment: .bottomTrailing) {
                Group {
                    if let previewImage {
                        Image(uiImage: previewImage).resizable().scaledToFill()
                    } else if let urlString = supabase.customer?.avatarUrl, let url = URL(string: urlString) {
                        AsyncImage(url: url) { phase in
                            if let image = phase.image {
                                image.resizable().scaledToFill()
                            } else {
                                avatarFallback
                            }
                        }
                    } else {
                        avatarFallback
                    }
                }
                .frame(width: 92, height: 92)
                .clipShape(Circle())

                ZStack {
                    Circle().fill(MinervaColor.ink).frame(width: 30, height: 30)
                    if isUploadingPhoto {
                        ProgressView().tint(.white).scaleEffect(0.7)
                    } else {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(.white)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .onChange(of: photoItem) { _, newItem in
            Task { await handlePhotoPicked(newItem) }
        }
    }

    private var avatarFallback: some View {
        ZStack {
            Circle().fill(MinervaColor.emerald.opacity(0.15))
            Text(initials(for: name))
                .font(.system(size: 26, weight: .bold))
                .foregroundStyle(MinervaColor.emeraldDark)
        }
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        return String(parts.prefix(2).compactMap { $0.first }).uppercased()
    }

    private func handlePhotoPicked(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        guard let data = try? await item.loadTransferable(type: Data.self),
              let uiImage = UIImage(data: data) else { return }
        previewImage = uiImage
        isUploadingPhoto = true
        guard let jpegData = uiImage.jpegData(compressionQuality: 0.82) else {
            isUploadingPhoto = false
            return
        }
        _ = await supabase.uploadAvatar(imageData: jpegData)
        isUploadingPhoto = false
    }

    // MARK: - Name

    /// Shared "field + inline save button" row used for both Name and
    /// Phone — same interaction (type, tap OK, see a checkmark) rather
    /// than two subtly different hand-rolled rows.
    @ViewBuilder
    private func savableField(
        label: String,
        placeholder: String,
        text: Binding<String>,
        isSaving: Bool,
        isSaved: Bool,
        keyboardType: UIKeyboardType = .default,
        disabled: Bool,
        onSave: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(MinervaColor.inkSoft)
            HStack(spacing: 10) {
                TextField("", text: text, prompt: Text(placeholder).foregroundStyle(MinervaColor.inkFaint))
                    .keyboardType(keyboardType)
                    .foregroundStyle(MinervaColor.ink)
                    .padding(12)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                    .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))

                Button(action: onSave) {
                    if isSaving {
                        ProgressView()
                    } else if isSaved {
                        Image(systemName: "checkmark").foregroundStyle(MinervaColor.emeraldDark)
                    } else {
                        Text("OK").font(.system(size: 13, weight: .semibold))
                    }
                }
                .frame(width: 44, height: 44)
                .background(MinervaColor.emerald.opacity(isSaved ? 0.12 : 1))
                .foregroundStyle(isSaved ? MinervaColor.emeraldDark : .white)
                .clipShape(RoundedRectangle(cornerRadius: 11))
                .buttonStyle(PressableButtonStyle())
                .disabled(isSaving || disabled)
            }
        }
    }

    private func saveName() async {
        isSavingName = true
        let ok = await supabase.updateName(name)
        isSavingName = false
        if ok {
            nameSaved = true
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            nameSaved = false
        }
    }

    private func savePhone() async {
        isSavingPhone = true
        let ok = await supabase.updatePhone(phone)
        isSavingPhone = false
        if ok {
            phoneSaved = true
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            phoneSaved = false
        }
    }

    // MARK: - Email

    private var emailSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Courriel")
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(MinervaColor.inkSoft)

            if emailStatus == .sent {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "envelope.badge.fill")
                        .font(.system(size: 13))
                        .padding(.top, 1)
                    Text("Vérifiez \(newEmail) pour confirmer le changement — votre courriel actuel reste actif jusque-là.")
                        .font(.system(size: 12.5))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(MinervaColor.emeraldDark)
                .padding(12)
                .background(MinervaColor.emerald.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 11))
            } else if isEditingEmail {
                VStack(alignment: .leading, spacing: 8) {
                    TextField("", text: $newEmail, prompt: Text("nouveau@exemple.com").foregroundStyle(MinervaColor.inkFaint))
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .foregroundStyle(MinervaColor.ink)
                        .padding(12)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 11))
                        .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))

                    if emailStatus == .error, let emailError {
                        Text(emailError)
                            .font(.system(size: 11.5))
                            .foregroundStyle(.red)
                    }

                    HStack(spacing: 10) {
                        Button {
                            Task { await requestEmailChange() }
                        } label: {
                            HStack {
                                if emailStatus == .sending { ProgressView().tint(.white) }
                                Text(emailStatus == .sending ? "Envoi…" : "Confirmer le changement")
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 11)
                        }
                        .background(MinervaColor.emerald)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 11))
                        .buttonStyle(PressableButtonStyle())
                        .disabled(emailStatus == .sending)

                        Button("Annuler") {
                            isEditingEmail = false
                            newEmail = supabase.customer?.email ?? ""
                            emailStatus = .idle
                        }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MinervaColor.inkSoft)
                    }
                }
            } else {
                Button {
                    isEditingEmail = true
                } label: {
                    HStack {
                        Text(supabase.customer?.email ?? "Aucun courriel")
                            .font(.system(size: 13.5))
                            .foregroundStyle(MinervaColor.ink)
                        Spacer()
                        Image(systemName: "pencil")
                            .font(.system(size: 12))
                            .foregroundStyle(MinervaColor.inkFaint)
                    }
                    .padding(12)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func requestEmailChange() async {
        let trimmed = newEmail.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, trimmed != supabase.customer?.email else {
            isEditingEmail = false
            return
        }
        emailStatus = .sending
        emailError = nil
        switch await supabase.requestEmailChange(trimmed) {
        case .sent:
            emailStatus = .sent
        case .failure(let message):
            emailStatus = .error
            emailError = message
        }
    }
}

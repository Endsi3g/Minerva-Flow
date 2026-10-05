import SwiftUI

/// Owner side of NFC: turn a blank sticker or card into a touchpoint. The
/// touchpoint itself (type, label, destination) is created on the web screen
/// that already owns attribution and funnel stats; here the owner picks one
/// and writes its /t/{code} link onto a tag, so a tap is counted exactly like
/// a QR scan of the same touchpoint.
struct OwnerNFCView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var touchpoints: [NativeOwnerTouchpoint] = []
    @State private var isLoading = true
    @State private var writer = NFCTagWriter()
    @State private var statusByID: [String: String] = [:]
    @State private var writingID: String?

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }

    var body: some View {
        List {
            Section {
                Text(isFrench
                     ? "Choisissez un point de contact, puis approchez le haut de l'iPhone d'un tag NFC vierge ou à reprogrammer. Le contenu actuel du tag sera remplacé."
                     : "Pick a touchpoint, then hold the top of your iPhone near a blank or re-usable NFC tag. The tag's current content will be replaced.")
                    .font(.footnote)
                    .foregroundStyle(MinervaColor.inkSoft)
                if !NFCTagReader.isAvailable {
                    Label(isFrench ? "L'écriture NFC n'est pas disponible sur cet appareil." : "NFC writing isn't available on this device.", systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.orange)
                }
            }

            Section(isFrench ? "Points de contact" : "Touchpoints") {
                if isLoading {
                    ProgressView()
                } else if touchpoints.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(isFrench ? "Aucun point de contact" : "No touchpoints yet").font(.headline)
                        Text(isFrench
                             ? "Créez-en un sur le web (Fidélisation → Points de contact) : chaque support garde ainsi ses propres statistiques."
                             : "Create one on the web (Loyalty → Touchpoints) so each tag keeps its own stats.")
                            .font(.footnote).foregroundStyle(MinervaColor.inkSoft)
                    }
                }
                ForEach(touchpoints) { touchpoint in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(touchpoint.label).font(.headline).foregroundStyle(MinervaColor.ink)
                                Text("\(touchpoint.type) · /t/\(touchpoint.code)")
                                    .font(.caption).foregroundStyle(MinervaColor.inkFaint)
                            }
                            Spacer()
                            Button {
                                write(touchpoint)
                            } label: {
                                Label(isFrench ? "Écrire sur un tag" : "Write to tag", systemImage: "wave.3.right")
                                    .font(.subheadline.weight(.semibold))
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(MinervaColor.emeraldDark)
                            .disabled(!NFCTagReader.isAvailable || writingID != nil)
                        }
                        if let status = statusByID[touchpoint.id] {
                            Text(status).font(.caption).foregroundStyle(MinervaColor.inkSoft)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            Section {
                Link(destination: Config.apiBaseURL.appending(path: "/fidelisation/points-de-contact")) {
                    Label(isFrench ? "Gérer les points de contact sur le web" : "Manage touchpoints on the web", systemImage: "safari")
                }
            }
        }
        .navigationTitle(isFrench ? "Tags NFC" : "NFC tags")
        .refreshable { await reload() }
        .task { await reload() }
    }

    private func reload() async {
        touchpoints = await supabase.loadOwnerTouchpoints()
        isLoading = false
    }

    private func write(_ touchpoint: NativeOwnerTouchpoint) {
        guard let url = NFCTagURL.touchpointURL(code: touchpoint.code) else {
            statusByID[touchpoint.id] = isFrench ? "Code de point de contact invalide." : "Invalid touchpoint code."
            return
        }
        writingID = touchpoint.id
        statusByID[touchpoint.id] = nil
        writer.begin(
            url: url,
            prompt: isFrench ? "Approchez le haut de l'iPhone d'un tag NFC." : "Hold the top of your iPhone near an NFC tag."
        ) { result in
            writingID = nil
            switch result {
            case .success:
                statusByID[touchpoint.id] = isFrench ? "Tag programmé : \(url.absoluteString)" : "Tag programmed: \(url.absoluteString)"
            case .failure(.unavailable):
                statusByID[touchpoint.id] = isFrench ? "NFC indisponible sur cet appareil." : "NFC unavailable on this device."
            case .failure(.notWritable):
                statusByID[touchpoint.id] = isFrench ? "Ce tag est verrouillé ou incompatible." : "This tag is locked or unsupported."
            case .failure(.tooLarge):
                statusByID[touchpoint.id] = isFrench ? "Ce tag est trop petit pour ce lien." : "This tag is too small for this link."
            case .failure:
                statusByID[touchpoint.id] = isFrench ? "L'écriture a échoué. Réessayez." : "Writing failed. Try again."
            }
        }
    }
}

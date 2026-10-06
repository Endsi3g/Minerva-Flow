import SwiftUI

/// The dedicated subpages "Plus" used to render as inline sections on one
/// long scrolling page. Behavior for each is carried over as-is from the
/// old ProfileView sections; only the navigation shape changed (pushed
/// subpages instead of a single stacked VStack), per the request to match
/// Menu Studio's "real subpages, not tabs/sections" pattern.

struct AppearanceSettingsView: View {
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @AppStorage("appAppearance") private var storedAppearance = AppAppearance.light.rawValue
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    private var selectedAppearance: AppAppearance {
        AppAppearance(rawValue: storedAppearance) ?? .light
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(isFrench ? "Votre Flow, à votre façon" : "Your Flow, your way")
                        .font(MinervaFont.display(27))
                        .foregroundStyle(MinervaColor.ink)
                    Text(isFrench ? "Choisissez une ambiance pour vos cartes, vos récompenses et votre compte. Le changement s’applique immédiatement." : "Choose a look for your cards, rewards and account. Changes apply immediately.")
                        .font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text(isFrench ? "APERÇU" : "PREVIEW")
                        .font(.mv(size: 11, weight: .semibold))
                        .foregroundStyle(MinervaColor.inkFaint)
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Minerva Flow").font(MinervaFont.display(22))
                            Text(isFrench ? "Votre carte de fidélité" : "Your loyalty card")
                                .font(.mv(size: 12))
                        }
                        Spacer()
                        Image(systemName: "sparkles").font(.mv(size: 24))
                    }
                    .foregroundStyle(.white).padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MinervaColor.emeraldDark)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    HStack(spacing: 12) {
                        Image(systemName: "gift.fill").foregroundStyle(MinervaColor.emeraldDark)
                        Text(isFrench ? "Vos prochaines récompenses" : "Your next rewards")
                            .font(.mv(size: 14, weight: .medium)).foregroundStyle(MinervaColor.ink)
                        Spacer()
                        Image(systemName: "chevron.right").foregroundStyle(MinervaColor.inkFaint)
                    }
                    .padding(16).background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel(isFrench ? "Aperçu du thème choisi" : "Selected theme preview")

                VStack(alignment: .leading, spacing: 12) {
                    Text(isFrench ? "Choisir un thème" : "Choose a theme")
                        .font(.mv(size: 15, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                    ForEach(AppAppearance.allCases) { option in
                        Button { storedAppearance = option.rawValue } label: {
                            HStack(spacing: 14) {
                                Image(systemName: icon(for: option))
                                    .font(.mv(size: 20)).foregroundStyle(MinervaColor.emeraldDark)
                                    .frame(width: 28)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(option.label(isFrench: isFrench)).font(.mv(size: 15, weight: .semibold))
                                        .foregroundStyle(MinervaColor.ink)
                                    Text(detail(for: option)).font(.mv(size: 12))
                                        .foregroundStyle(MinervaColor.inkSoft)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                Spacer(minLength: 8)
                                Image(systemName: selectedAppearance == option ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(selectedAppearance == option ? MinervaColor.emeraldDark : MinervaColor.inkFaint)
                            }
                            .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                            .background(MinervaColor.creamSoft)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16)
                                .stroke(selectedAppearance == option ? MinervaColor.emeraldDark : MinervaColor.border, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .accessibilityElement(children: .combine)
                        .accessibilityAddTraits(selectedAppearance == option ? [.isSelected] : [])
                    }
                }
                Label(isFrench ? "Votre choix est enregistré sur cet appareil. La taille du texte suit vos réglages iOS." : "Your choice is saved on this device. Text size follows your iOS settings.", systemImage: "textformat.size")
                    .font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft)
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Apparence" : "Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func icon(for option: AppAppearance) -> String {
        switch option {
        case .light: "sun.max.fill"
        case .system: "iphone"
        case .dark: "moon.fill"
        }
    }

    private func detail(for option: AppAppearance) -> String {
        switch option {
        case .light: isFrench ? "Des surfaces crème et des accents émeraude." : "Cream surfaces and emerald accents."
        case .system: isFrench ? "Suit automatiquement le thème clair ou sombre de votre iPhone." : "Automatically follows your iPhone’s light or dark theme."
        case .dark: isFrench ? "Des surfaces profondes pour les ambiances tamisées." : "Deep surfaces for dim surroundings."
        }
    }

}

struct NotificationSettingsView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var frequency = "all"
    @State private var isSaving = false
    @State private var message: String?
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(isFrench ? "Choisissez à quelle fréquence les restaurants où vous avez une carte vous écrivent. Vous pouvez changer à tout moment." : "Choose how often the restaurants where you have a card contact you. You can change this at any time.")
                    .font(.mv(size: 14))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)

                VStack(spacing: 0) {
                    frequencyRow(value: "important_only",
                                 title: isFrench ? "L'essentiel seulement" : "Essentials only",
                                 subtitle: isFrench ? "Anniversaire et récompenses prêtes" : "Birthday and rewards ready")
                    CompteSeparator()
                    frequencyRow(value: "all",
                                 title: isFrench ? "Normal (recommandé)" : "Normal (recommended)",
                                 subtitle: isFrench ? "Offres, rappels de visite, anniversaire" : "Offers, visit reminders, birthday")
                    CompteSeparator()
                    frequencyRow(value: "frequent",
                                 title: isFrench ? "Fréquent" : "Frequent",
                                 subtitle: isFrench ? "Jusqu'à 2 notifications par jour, entre 9 h et 20 h, avec des messages variés" : "Up to 2 notifications a day, between 9 am and 8 pm, with varied messages")
                }
                .background(MinervaColor.creamSoft)
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 16))

                // Immediate, polite feedback after every change (saved or failed).
                if isSaving {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text(isFrench ? "Enregistrement…" : "Saving…")
                    }
                    .font(.mv(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                } else if let message {
                    Text(message)
                        .font(.mv(size: 13, weight: .medium))
                        .foregroundStyle(MinervaColor.emeraldDark)
                        .accessibilityAddTraits(.updatesFrequently)
                }

                Text(isFrench ? "Ces messages ne sont envoyés qu'aux personnes qui ont accepté de recevoir des offres, et uniquement par notification dans l'app au niveau Fréquent." : "These messages are only sent to people who agreed to receive offers, and only as in-app notifications at the Frequent level.")
                    .font(.mv(size: 12))
                    .foregroundStyle(MinervaColor.inkFaint)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if let f = supabase.customer?.notificationFrequency { frequency = f }
        }
    }

    private func frequencyRow(value: String, title: String, subtitle: String) -> some View {
        Button {
            guard frequency != value, !isSaving else { return }
            let previous = frequency
            frequency = value
            Task {
                isSaving = true
                message = nil
                let ok = await supabase.updateNotificationFrequency(value)
                isSaving = false
                if ok {
                    message = isFrench ? "Préférence enregistrée." : "Preference saved."
                } else {
                    // Keep the screen truthful: go back to what is actually saved.
                    frequency = previous
                    message = isFrench ? "Impossible d'enregistrer pour l'instant. Réessayez." : "Couldn't save right now. Try again."
                }
            }
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.mv(size: 14, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(subtitle)
                        .font(.mv(size: 12))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Image(systemName: frequency == value ? "checkmark.circle.fill" : "circle")
                    .font(.mv(size: 20))
                    .foregroundStyle(frequency == value ? MinervaColor.emeraldDark : MinervaColor.inkFaint)
                    .accessibilityHidden(true)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(frequency == value ? [.isSelected] : [])
    }
}

struct PrivacyConsentView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var isExportingData = false
    @State private var exportedDataFileURL: URL?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let customer = supabase.customer {
                    consentSection(for: customer)
                }
                exportSection
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle("Confidentialité")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func consentSection(for customer: Customer) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Communications")
                .font(.mv(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Offres et nouvelles par courriel")
                        .font(.mv(size: 13, weight: .medium))
                        .foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Vous pouvez retirer votre consentement à tout moment.")
                        .font(.mv(size: 11))
                        .foregroundStyle(MinervaColor.inkFaint)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Toggle("", isOn: Binding(
                    get: { customer.marketingConsent },
                    set: { newValue in
                        Task { await supabase.updateMarketingConsent(newValue) }
                    }
                ))
                .labelsHidden()
                .tint(MinervaColor.emerald)
            }
            .padding(14)
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    /// Loi 25 self-serve portability, matching the web portal's own export
    /// button. Fetches the JSON export on tap (rather than eagerly) and
    /// hands it to a ShareLink the instant it's ready.
    private var exportSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Vos données")
                .font(.mv(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            Group {
                if let exportedDataFileURL {
                    ShareLink(item: exportedDataFileURL) {
                        exportRowLabel(title: "Exporter mes données")
                    }
                } else {
                    Button {
                        Task {
                            isExportingData = true
                            exportedDataFileURL = await supabase.exportMyData()
                            isExportingData = false
                        }
                    } label: {
                        exportRowLabel(title: isExportingData ? "Préparation…" : "Exporter mes données")
                    }
                    .buttonStyle(.plain)
                    .disabled(isExportingData)
                }
            }
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func exportRowLabel(title: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "square.and.arrow.down")
                .font(.mv(size: 14))
                .foregroundStyle(MinervaColor.inkSoft)
                .frame(width: 20)
            Text(title)
                .font(.mv(size: 13))
                .foregroundStyle(MinervaColor.ink)
            Spacer(minLength: 8)
        }
        .padding(14)
    }
}

struct SecuritySettingsView: View {
    @EnvironmentObject var biometricLock: BiometricLock
    @EnvironmentObject var supabase: SupabaseManager
    @State private var showDeleteAccountSheet = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Sécurité")
                        .font(.mv(size: 13, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    Toggle(isOn: Binding(
                        get: { biometricLock.isEnabled },
                        set: { newValue in
                            withAnimation { biometricLock.isEnabled = newValue }
                            let generator = UIImpactFeedbackGenerator(style: .light)
                            generator.impactOccurred()
                        }
                    )) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Verrouiller avec \(biometricLock.biometryLabel)")
                                .font(.mv(size: 13, weight: .medium))
                                .foregroundStyle(MinervaColor.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Text("Demande une vérification à chaque retour dans l'application.")
                                .font(.mv(size: 11))
                                .foregroundStyle(MinervaColor.inkFaint)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .tint(MinervaColor.emerald)
                    .padding(14)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Zone de danger")
                        .font(.mv(size: 13, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    Button {
                        showDeleteAccountSheet = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "trash")
                                .font(.mv(size: 14))
                                .foregroundStyle(.red)
                                .frame(width: 20)
                            VStack(alignment: .leading, spacing: 1) {
                                Text("Supprimer mon compte")
                                    .font(.mv(size: 13, weight: .medium))
                                    .foregroundStyle(.red)
                                    .fixedSize(horizontal: false, vertical: true)
                                HStack(spacing: 4) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.mv(size: 9))
                                    Text("Action irréversible")
                                }
                                .font(.mv(size: 10.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                            }
                            Spacer(minLength: 8)
                        }
                        .padding(14)
                    }
                    .buttonStyle(.plain)
                    .background(Color.red.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.red.opacity(0.2)))
                }
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle("Sécurité")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showDeleteAccountSheet) {
            DeleteAccountSheet()
        }
    }
}

struct AboutView: View {
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var legalSheet: AuthView.LegalDocument?
    @State private var showSurvey = false
    @State private var showChangelog = false
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                aboutRow(icon: "doc.text", title: "Conditions d'utilisation") { legalSheet = .terms }
                Divider().padding(.leading, 44)
                aboutRow(icon: "lock", title: "Politique de confidentialité") { legalSheet = .privacy }
                Divider().padding(.leading, 44)
                aboutRow(icon: "text.bubble", title: "Donner votre avis") { showSurvey = true }
                Divider().padding(.leading, 44)
                aboutRow(icon: "sparkles", title: isFrench ? "Mises à jour" : "Updates") { showChangelog = true }
                Divider().padding(.leading, 44)
                aboutRowLabel(icon: "info.circle", title: "Version", value: "1.0.0")
            }
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle("À propos")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $legalSheet) { doc in
            LegalDocumentSheet(document: doc)
        }
        .sheet(isPresented: $showSurvey) {
            SurveyView()
        }
        .sheet(isPresented: $showChangelog) {
            NavigationStack {
                ClientUpdatesView()
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Fermer") { showChangelog = false }.foregroundStyle(MinervaColor.emeraldDark)
                        }
                    }
            }
        }
    }

    private func aboutRow(icon: String, title: String, action: @escaping () -> Void) -> some View {
        Button { action() } label: {
            aboutRowLabel(icon: icon, title: title, value: nil)
        }
        .buttonStyle(.plain)
    }

    private func aboutRowLabel(icon: String, title: String, value: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.mv(size: 14))
                .foregroundStyle(MinervaColor.inkSoft)
                .frame(width: 20)
            Text(title)
                .font(.mv(size: 13))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 8)
            if let value {
                Text(value)
                    .font(.mv(size: 12.5))
                    .foregroundStyle(MinervaColor.inkFaint)
            } else {
                Image(systemName: "chevron.right")
                    .font(.mv(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
        }
        .padding(14)
    }
}

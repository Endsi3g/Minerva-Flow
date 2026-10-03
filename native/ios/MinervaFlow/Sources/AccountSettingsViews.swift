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

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text(isFrench ? "Thème" : "Theme")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                Picker(isFrench ? "Thème" : "Theme", selection: $storedAppearance) {
                    ForEach(AppAppearance.allCases) { option in
                        Text(option.label(isFrench: isFrench)).tag(option.rawValue)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityLabel(isFrench ? "Choisir le thème de l’application" : "Choose app theme")
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Apparence" : "Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct NotificationSettingsView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var frequency = "all"
    @State private var isSaving = false
    @State private var savedTick = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if savedTick {
                    Text("Préférences enregistrées.")
                        .font(.system(size: 12.5))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
                VStack(spacing: 0) {
                    frequencyRow(value: "all", title: "Tout", subtitle: "Offres, rappels de visite, anniversaire")
                    Divider().padding(.leading, 16)
                    frequencyRow(value: "important_only", title: "L'essentiel seulement", subtitle: "Anniversaire et récompenses prêtes")
                }
                .background(MinervaColor.creamSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14))
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
            guard frequency != value else { return }
            frequency = value
            Task {
                isSaving = true
                let ok = await supabase.updateNotificationFrequency(value)
                isSaving = false
                if ok {
                    savedTick = true
                    try? await Task.sleep(nanoseconds: 1_500_000_000)
                    savedTick = false
                }
            }
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(MinervaColor.inkFaint)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                if frequency == value {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
            }
            .padding(14)
        }
        .buttonStyle(.plain)
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
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Offres et nouvelles par courriel")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Vous pouvez retirer votre consentement à tout moment.")
                        .font(.system(size: 11))
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
                .font(.system(size: 13, weight: .semibold))
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
                .font(.system(size: 14))
                .foregroundStyle(MinervaColor.inkSoft)
                .frame(width: 20)
            Text(title)
                .font(.system(size: 13))
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
                        .font(.system(size: 13, weight: .semibold))
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
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(MinervaColor.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Text("Demande une vérification à chaque retour dans l'application.")
                                .font(.system(size: 11))
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
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    Button {
                        showDeleteAccountSheet = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "trash")
                                .font(.system(size: 14))
                                .foregroundStyle(.red)
                                .frame(width: 20)
                            VStack(alignment: .leading, spacing: 1) {
                                Text("Supprimer mon compte")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(.red)
                                    .fixedSize(horizontal: false, vertical: true)
                                HStack(spacing: 4) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.system(size: 9))
                                    Text("Action irréversible")
                                }
                                .font(.system(size: 10.5))
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
                NativeChangelogView()
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
                .font(.system(size: 14))
                .foregroundStyle(MinervaColor.inkSoft)
                .frame(width: 20)
            Text(title)
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 8)
            if let value {
                Text(value)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkFaint)
            } else {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
        }
        .padding(14)
    }
}

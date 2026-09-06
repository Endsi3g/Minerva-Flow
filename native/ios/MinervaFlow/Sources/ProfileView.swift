import SwiftUI

/// Real settings, matching the web portal's ProfileSettingsCard depth
/// (notification frequency, sign out) rather than a bare name-and-signout
/// stub — the account-management surface a production app actually needs,
/// not a placeholder.
struct ProfileView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @EnvironmentObject var biometricLock: BiometricLock
    @State private var frequency = "all"
    @State private var isSavingFrequency = false
    @State private var savedTick = false
    @State private var showSignOutConfirm = false
    @State private var legalSheet: AuthView.LegalDocument?
    @State private var showDeleteAccountSheet = false
    @State private var showEditProfile = false

    var body: some View {
        Group {
            if supabase.isLoadingData && supabase.customer == nil {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        Skeletons.card(height: 220)
                        Skeletons.card(height: 100)
                        Skeletons.list(count: 3)
                    }
                    .padding(18)
                }
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        if let customer = supabase.customer {
                            identityCard(for: customer)
                            pointsHistorySection
                            notificationSection
                            securitySection
                            aboutSection
                            signOutButton
                            dangerZone
                        } else {
                            Text("Aucun profil trouvé.")
                                .font(.system(size: 13))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .padding(.top, 40)
                        }
                    }
                    .padding(18)
                }
            }
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .onAppear {
            if let f = supabase.customer?.notificationFrequency { frequency = f }
        }
        .confirmationDialog(
            "Se déconnecter ?",
            isPresented: $showSignOutConfirm,
            titleVisibility: .visible
        ) {
            Button("Se déconnecter", role: .destructive) {
                Task { await supabase.signOut() }
            }
            Button("Annuler", role: .cancel) {}
        }
        .sheet(item: $legalSheet) { doc in
            LegalDocumentSheet(document: doc)
        }
        .sheet(isPresented: $showDeleteAccountSheet) {
            DeleteAccountSheet()
        }
        .sheet(isPresented: $showEditProfile) {
            if let customer = supabase.customer {
                EditProfileSheet(customer: customer)
            }
        }
    }

    // MARK: - Identity

    private func identityCard(for customer: Customer) -> some View {
        let tier = LoyaltyTier.resolve(totalSpent: customer.totalSpent, tier2: supabase.loyaltyTier2Threshold, tier3: supabase.loyaltyTier3Threshold)

        return VStack(spacing: 14) {
            Group {
                if let urlString = customer.avatarUrl, let url = URL(string: urlString) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else {
                            avatarPlaceholder(tier: tier, customer: customer)
                        }
                    }
                } else {
                    avatarPlaceholder(tier: tier, customer: customer)
                }
            }
            .frame(width: 64, height: 64)
            .clipShape(Circle())

            VStack(spacing: 2) {
                Text(customer.name)
                    .font(MinervaFont.display(19))
                    .foregroundStyle(MinervaColor.ink)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                if let email = customer.email {
                    Text(email)
                        .font(.system(size: 12))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                if let restaurantName = supabase.restaurantName {
                    Text(restaurantName)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MinervaColor.inkSoft)
                }
            }

            Button {
                showEditProfile = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "pencil")
                    Text("Modifier le profil")
                }
                .font(.system(size: 12, weight: .semibold))
            }
            .foregroundStyle(MinervaColor.emeraldDark)
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(MinervaColor.emerald.opacity(0.12))
            .clipShape(Capsule())
            .buttonStyle(PressableButtonStyle())

            HStack(spacing: 22) {
                statTile(value: "\(customer.loyaltyPoints)", label: "points")
                statTile(value: "\(customer.visitCount)", label: "visites")
                statTile(value: tier.label, label: "statut")
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    // MARK: - Points & rewards history

    /// Every points event (earned or spent) plus every reward redemption
    /// in one place — Home only ever shows a trimmed preview of this same
    /// data (5 most recent transactions); Profile is where the full record
    /// lives, matching the web portal's own Profile tab.
    private var pointsHistorySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Points et récompenses")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            if supabase.transactions.isEmpty && supabase.redemptions.isEmpty {
                Text("Aucun mouvement de points pour l'instant.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(.vertical, 4)
            } else {
                VStack(spacing: 6) {
                    ForEach(historyEntries, id: \.id) { entry in
                        HStack {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(entry.title)
                                    .font(.system(size: 12.5, weight: .medium))
                                    .foregroundStyle(MinervaColor.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                                Text(entry.date.formatted(date: .abbreviated, time: .omitted))
                                    .font(.system(size: 10.5))
                                    .foregroundStyle(MinervaColor.inkFaint)
                            }
                            Spacer(minLength: 8)
                            Text("\(entry.pointsDelta >= 0 ? "+" : "")\(entry.pointsDelta) pts")
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundStyle(entry.pointsDelta >= 0 ? MinervaColor.emeraldDark : .red)
                        }
                        .padding(12)
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
    }

    private struct HistoryEntry { let id: String; let title: String; let date: Date; let pointsDelta: Int }

    private var historyEntries: [HistoryEntry] {
        let fromTransactions = supabase.transactions.map {
            HistoryEntry(id: "tx-\($0.id)", title: label(forTransactionType: $0.type), date: $0.createdAt, pointsDelta: $0.pointsDelta)
        }
        let fromRedemptions = supabase.redemptions.map {
            HistoryEntry(id: "redeem-\($0.id)", title: "Récompense échangée : \($0.rewardName)", date: $0.createdAt, pointsDelta: -$0.pointsSpent)
        }
        return (fromTransactions + fromRedemptions).sorted { $0.date > $1.date }
    }

    private func label(forTransactionType type: String) -> String {
        switch type {
        case "visite": return "Visite"
        case "ajustement": return "Ajustement"
        case "echange": return "Récompense échangée"
        default: return type
        }
    }

    private func avatarPlaceholder(tier: LoyaltyTier, customer: Customer) -> some View {
        ZStack {
            Circle().fill(tier.bannerColor)
            Text(initials(for: customer.name))
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(tier.bannerForeground)
        }
    }

    private func statTile(value: String, label: String) -> some View {
        VStack(spacing: 1) {
            Text(value)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(MinervaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.system(size: 10.5))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(minWidth: 56)
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap { $0.first }
        return String(letters).uppercased()
    }

    // MARK: - Notifications

    private var notificationSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Notifications")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 0) {
                frequencyRow(value: "all", title: "Tout", subtitle: "Offres, rappels de visite, anniversaire")
                Divider().padding(.leading, 16)
                frequencyRow(value: "important_only", title: "L'essentiel seulement", subtitle: "Anniversaire et récompenses prêtes")
            }
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func frequencyRow(value: String, title: String, subtitle: String) -> some View {
        Button {
            guard frequency != value else { return }
            frequency = value
            Task {
                isSavingFrequency = true
                let ok = await supabase.updateNotificationFrequency(value)
                isSavingFrequency = false
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

    // MARK: - Security

    private var securitySection: some View {
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
    }

    // MARK: - About / legal

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("À propos")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 0) {
                aboutRow(icon: "doc.text", title: "Conditions d'utilisation") {
                    legalSheet = .terms
                }
                Divider().padding(.leading, 44)
                aboutRow(icon: "lock", title: "Politique de confidentialité") {
                    legalSheet = .privacy
                }
                Divider().padding(.leading, 44)
                aboutRow(icon: "info.circle", title: "Version", value: "1.0.0")
            }
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func aboutRow(icon: String, title: String, value: String? = nil, action: (() -> Void)? = nil) -> some View {
        Button {
            action?()
        } label: {
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
        .buttonStyle(.plain)
        .disabled(action == nil)
    }

    // MARK: - Sign out

    private var signOutButton: some View {
        Button {
            showSignOutConfirm = true
        } label: {
            Text("Se déconnecter")
                .font(.system(size: 14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
        }
        .foregroundStyle(.red)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.red.opacity(0.3)))
    }

    // MARK: - Danger zone

    private var dangerZone: some View {
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
}

/// Requires typing SUPPRIMER rather than a single confirm tap — mirrors the
/// web portal's DeleteAccountModal exactly (same copy, same confirmation
/// friction) since this is the one action in the app that cannot be undone.
struct DeleteAccountSheet: View {
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @State private var confirmText = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?
    @FocusState private var isFocused: Bool

    private var canConfirm: Bool {
        confirmText.trimmingCharacters(in: .whitespaces).uppercased() == "SUPPRIMER"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Votre accès sera immédiatement révoqué et vos informations personnelles (nom, courriel, date de naissance, ville) seront effacées de tous les restaurants où vous êtes membre. Vos points, visites et récompenses restent dans les registres du restaurant, mais ne pourront plus être réclamés.")
                        .font(.system(size: 13))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Tapez « SUPPRIMER » pour confirmer")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundStyle(MinervaColor.inkSoft)
                        TextField("", text: $confirmText, prompt: Text("SUPPRIMER").foregroundStyle(MinervaColor.inkFaint))
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .focused($isFocused)
                            .foregroundStyle(MinervaColor.ink)
                            .padding(12)
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 11))
                            .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 12.5))
                            .foregroundStyle(.red)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Button {
                        isFocused = false
                        Task {
                            isDeleting = true
                            errorMessage = nil
                            let ok = await supabase.deleteAccount()
                            isDeleting = false
                            if ok {
                                dismiss()
                            } else {
                                errorMessage = "La suppression a échoué. Réessayez ou contactez le restaurant."
                            }
                        }
                    } label: {
                        HStack {
                            if isDeleting { ProgressView().tint(.white) }
                            Text(isDeleting ? "Suppression…" : "Supprimer définitivement mon compte")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                    }
                    .background(.red)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .buttonStyle(PressableButtonStyle())
                    .disabled(!canConfirm || isDeleting)
                    .opacity(canConfirm ? 1 : 0.5)
                }
                .padding(18)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Supprimer mon compte")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { dismiss() }
                        .disabled(isDeleting)
                }
            }
        }
    }
}

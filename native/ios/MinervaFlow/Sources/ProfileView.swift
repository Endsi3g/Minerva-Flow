import SwiftUI

/// Real settings, matching the web portal's ProfileSettingsCard depth
/// (notification frequency, sign out) rather than a bare name-and-signout
/// stub — the account-management surface a production app actually needs,
/// not a placeholder.
struct ProfileView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @EnvironmentObject var biometricLock: BiometricLock
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @AppStorage("appAppearance") private var storedAppearance = AppAppearance.light.rawValue
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }
    @State private var frequency = "all"
    @State private var isSavingFrequency = false
    @State private var savedTick = false
    @State private var showSignOutConfirm = false
    @State private var legalSheet: AuthView.LegalDocument?
    @State private var showDeleteAccountSheet = false
    @State private var showEditProfile = false
    @State private var isExportingData = false
    @State private var exportedDataFileURL: URL?
    @State private var historyFilter: HistoryFilter = .all
    @State private var showAllHistory = false
    @State private var showSurvey = false
    @State private var showFavorites = false
    @State private var showCards = false
    @State private var showDiscovery = false
    @State private var showAmbassador = false
    @State private var showChangelog = false

    private enum HistoryFilter: String, CaseIterable {
        case all, earned, redeemed
        var label: String {
            switch self {
            case .all: return "Tous"
            case .earned: return "Gagnés"
            case .redeemed: return "Échangés"
            }
        }
    }

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
                        moreHeader
                        if let error = supabase.lastError {
                            feedbackBanner(icon: "exclamationmark.triangle.fill", title: "Action impossible", message: error, color: .red)
                        } else if savedTick {
                            feedbackBanner(icon: "checkmark.circle.fill", title: "Préférences enregistrées", message: "Vos notifications sont à jour.", color: MinervaColor.emerald)
                        }
                        if let customer = supabase.customer {
                            identityCard(for: customer)
                            favoritesRow
                            cardsRow
                            membershipsSection
                            ambassadorRow
                            pointsHistorySection
                            appearanceSection
                            notificationSection
                            consentSection(for: customer)
                            securitySection
                            aboutSection
                            signOutButton
                            dangerZone
                            brandFooter
                        } else {
                            NoProfileFoundView()
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
        .sheet(isPresented: $showSurvey) {
            SurveyView()
        }
        .sheet(isPresented: $showFavorites) {
            FavoritesView()
        }
        .sheet(isPresented: $showCards) {
            MembershipCardsView()
        }
        .sheet(isPresented: $showDiscovery) {
            RestaurantMapView()
        }
        .sheet(isPresented: $showAmbassador) {
            FlowAmbassadorMobileView()
                .environmentObject(supabase)
        }
        .sheet(isPresented: $showChangelog) {
            NavigationStack {
                NativeChangelogView()
            }
        }
    }

    private var moreHeader: some View {
            HStack(alignment: .center, spacing: 12) {
            Image("LogoMark")
                .resizable()
                .frame(width: 34, height: 34)
            VStack(alignment: .leading, spacing: 3) {
                Text(isFrench ? "Plus" : "More")
                    .font(MinervaFont.display(28, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                Text(isFrench ? "Votre compte, vos cartes, vos offres et vos préférences au même endroit" : "Your account, cards, offers and preferences in one place")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
            }
            Spacer()
            LanguageMenu(language: Binding(
                get: { AppLanguage(rawValue: storedLanguage) ?? .fr },
                set: { storedLanguage = $0.rawValue }
            ))
            .foregroundStyle(MinervaColor.emeraldDark)
            Menu {
                Button("Modifier le profil") { showEditProfile = true }
                Button("Donner un avis") { showSurvey = true }
                Divider()
                Button("Se déconnecter", role: .destructive) { showSignOutConfirm = true }
            } label: {
                Image(systemName: "ellipsis.circle.fill")
                    .font(.system(size: 26))
                    .foregroundStyle(MinervaColor.emerald)
            }
            .accessibilityLabel("Actions du compte")
        }
    }

    private func feedbackBanner(icon: String, title: String, message: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon).foregroundStyle(color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 12.5, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                Text(message).font(.system(size: 11.5)).foregroundStyle(MinervaColor.inkSoft)
            }
            Spacer(minLength: 0)
        }
        .padding(13)
        .background(color.opacity(0.09))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Favorites

    /// Entry point to FavoritesView — same aboutRow-style tappable row as
    /// the "À propos" section, but pulled up next to the identity card
    /// since favorites are a browsing shortcut a customer would reach for
    /// often, not a one-off settings toggle.
    private var favoritesRow: some View {
        Button {
            showFavorites = true
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.red)
                    .frame(width: 20)
                Text("Mes favoris")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(MinervaColor.ink)
                Spacer(minLength: 8)
                let count = (supabase.customer?.favoriteMenuItemIds.count ?? 0) + (supabase.customer?.favoriteOfferIds.count ?? 0)
                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 12))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
            .padding(14)
        }
        .buttonStyle(.plain)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var brandFooter: some View {
        HStack(spacing: 8) {
            Image("LogoMark")
                .resizable()
                .frame(width: 24, height: 24)
            Text("Minerva Flow")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
        .padding(.bottom, 16)
    }

    private var cardsRow: some View {
        Button { showCards = true } label: {
            HStack(spacing: 12) {
                Image(systemName: "wallet.pass.fill")
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .frame(width: 20)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Mes cartes fidélité")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(MinervaColor.ink)
                    Text("Consulter vos soldes et ajouter une carte à Apple Wallet")
                        .font(.system(size: 11.5))
                        .foregroundStyle(MinervaColor.inkSoft)
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
            .padding(14)
        }
        .buttonStyle(.plain)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var ambassadorRow: some View {
        Button { showAmbassador = true } label: {
            HStack(spacing: 12) {
                Image(systemName: "megaphone.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .frame(width: 22)
                VStack(alignment: .leading, spacing: 3) {
                    Text(isFrench ? "Devenir ambassadeur" : "Become an ambassador")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    Text(isFrench ? "Recommandez Minerva Flow et suivez vos récompenses" : "Recommend Minerva Flow and track your rewards")
                        .font(.system(size: 11.5))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 6)
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
            .padding(14)
        }
        .buttonStyle(.plain)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
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

    private var membershipsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Mes cartes et mes points")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            if supabase.allMemberships.isEmpty {
            Text("Votre solde apparaîtra ici dès votre première adhésion.")
                .font(.system(size: 12.5)).foregroundStyle(MinervaColor.inkSoft)
            Button {
                showDiscovery = true
            } label: {
                Label("Découvrir les restaurants près de vous", systemImage: "map.fill")
                    .font(.system(size: 12.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }
            .buttonStyle(.plain)
            } else {
                ForEach(supabase.allMemberships) { membership in
                    HStack(spacing: 12) {
                        Image(systemName: "storefront.fill")
                            .foregroundStyle(MinervaColor.emeraldDark)
                            .frame(width: 22)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(membership.restaurantName).font(.system(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                            Text("\(membership.visitCount) visite\(membership.visitCount == 1 ? "" : "s") · \(currencyString(membership.totalSpent)) dépensés")
                                .font(.system(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
                        }
                        Spacer()
                        Text("\(membership.loyaltyPoints) pts")
                            .font(.system(size: 13, weight: .bold)).foregroundStyle(MinervaColor.emeraldDark)
                    }
                    .padding(12)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private func currencyString(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "CAD"
        formatter.locale = Locale(identifier: "fr_CA")
        return formatter.string(from: NSNumber(value: value)) ?? "0,00 $"
    }

    /// Every points event (earned or spent) plus every reward redemption
    /// in one place — Home only ever shows a trimmed preview of this same
    /// data (5 most recent transactions); Profile is where the full record
    /// lives, matching the web portal's own Profile tab.
    private var filteredHistory: [LoyaltyHistoryEntry] {
        switch historyFilter {
        case .all: return supabase.combinedHistory
        case .earned: return supabase.combinedHistory.filter { $0.pointsDelta >= 0 }
        case .redeemed: return supabase.combinedHistory.filter { $0.pointsDelta < 0 }
        }
    }

    private static let historyPageSize = 6

    private var visibleHistory: [LoyaltyHistoryEntry] {
        showAllHistory ? filteredHistory : Array(filteredHistory.prefix(Self.historyPageSize))
    }

    private var pointsHistorySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Points et récompenses")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            // Its own row, not squeezed beside the title — a segmented
            // control still reads as compact even at full label width,
            // and cramming it into the title's trailing space is what
            // truncated "Échangés" into "Échang…".
            Picker("Filtrer", selection: $historyFilter) {
                ForEach(HistoryFilter.allCases, id: \.self) { filter in
                    Text(filter.label).tag(filter)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: historyFilter) { _, _ in showAllHistory = false }

            if supabase.combinedHistory.isEmpty {
                Text("Aucun mouvement de points pour l'instant.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(.vertical, 4)
            } else if filteredHistory.isEmpty {
                Text("Aucun résultat pour ce filtre.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .padding(.vertical, 4)
            } else {
                VStack(spacing: 6) {
                    ForEach(visibleHistory) { entry in
                        HStack {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(entry.title)
                                    .font(.system(size: 12.5, weight: .medium))
                                    .foregroundStyle(MinervaColor.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                                HStack(spacing: 4) {
                                    Text(entry.date.formatted(date: .abbreviated, time: .omitted))
                                    if let restaurantName = entry.restaurantName {
                                        Text("· \(restaurantName)")
                                    }
                                }
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

                if filteredHistory.count > Self.historyPageSize {
                    Button {
                        showAllHistory.toggle()
                    } label: {
                        Text(showAllHistory ? "Voir moins" : "Voir plus (\(filteredHistory.count - Self.historyPageSize))")
                            .font(.system(size: 12, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .padding(.vertical, 8)
                    .foregroundStyle(MinervaColor.emeraldDark)
                }
            }
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

    private var appearanceSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(isFrench ? "Apparence" : "Appearance")
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
    }

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

    // MARK: - Consent

    /// A customer's marketing consent was, until now, only ever set once
    /// (or missed entirely) at signup with no way to revisit it — this is
    /// the missing "change your mind later" surface, mirroring the web
    /// portal's own consent toggle in ProfileSettingsCard.
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
                aboutRow(icon: "text.bubble", title: "Donner votre avis") {
                    showSurvey = true
                }
                Divider().padding(.leading, 44)
                aboutRow(icon: "sparkles", title: isFrench ? "Mises à jour" : "Updates") {
                    showChangelog = true
                }
                Divider().padding(.leading, 44)
                exportDataRow
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
            aboutRowLabel(icon: icon, title: title, value: value)
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
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

    /// Loi 25 self-serve portability, matching the web portal's own export
    /// button. Fetches the JSON export on tap (rather than eagerly on
    /// screen load, since it's a network call the person may never use)
    /// and hands it to a real ShareLink the instant it's ready — the same
    /// save/share mechanism already used for referral links and reviews,
    /// so saving to Files or AirDropping it works exactly the way someone
    /// already expects from the rest of the app.
    private var exportDataRow: some View {
        Group {
            if let exportedDataFileURL {
                ShareLink(item: exportedDataFileURL) {
                    aboutRowLabel(icon: "square.and.arrow.down", title: "Exporter mes données")
                }
            } else {
                Button {
                    Task {
                        isExportingData = true
                        exportedDataFileURL = await supabase.exportMyData()
                        isExportingData = false
                    }
                } label: {
                    aboutRowLabel(icon: "square.and.arrow.down", title: isExportingData ? "Préparation…" : "Exporter mes données")
                }
                .buttonStyle(.plain)
                .disabled(isExportingData)
            }
        }
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

struct FlowAmbassadorMobileView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var dashboard: FlowAmbassadorDashboard?
    @State private var isBusy = false
    @State private var hasLoaded = false
    @State private var message: String?
    @State private var ugcRestaurantId = ""
    @State private var ugcPlatform = "instagram"
    @State private var ugcReferralLinkId = ""
    @State private var ugcPostUrl = ""
    @State private var ugcCaption = "#MinervaFlow"
    @State private var trackingLabel = ""
    @State private var trackingContentUrl = ""
    @State private var trackingPlatform = "instagram"
    @State private var disclosureConfirmed = false
    @State private var rightsConfirmed = false
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    introCard
                    if let dashboard, let summary = dashboard.summary {
                        metrics(summary)
                        if let shareUrl = dashboard.shareUrl, let url = URL(string: shareUrl) {
                            ShareLink(item: url) {
                                Label(isFrench ? "Partager mon lien" : "Share my link", systemImage: "square.and.arrow.up")
                                    .font(.system(size: 14, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                            }
                            .tint(.white)
                            .background(MinervaColor.emerald)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            Text(url.absoluteString)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .textSelection(.enabled)
                        }
                        trackingLinksSection(summary)
                        payoutSection(dashboard: dashboard, summary: summary)
                        ugcSection(dashboard)
                    } else if !hasLoaded {
                        ProgressView().frame(maxWidth: .infinity).padding(24)
                    } else if dashboard?.summary == nil {
                        Button {
                            Task {
                                isBusy = true
                                dashboard = await supabase.joinFlowAmbassador()
                                message = dashboard == nil ? (isFrench ? "Impossible de créer le compte. Réessayez." : "We couldn't create your account. Try again.") : nil
                                isBusy = false
                            }
                        } label: {
                            if isBusy { ProgressView().tint(.white) }
                            else { Text(isFrench ? "Rejoindre le programme" : "Join the program") }
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(MinervaColor.emerald)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .disabled(isBusy)
                    } else {
                        ProgressView().frame(maxWidth: .infinity).padding(24)
                    }
                    if let message {
                        Text(message).font(.system(size: 12)).foregroundStyle(.red).fixedSize(horizontal: false, vertical: true)
                    }
                    Text(isFrench
                        ? "La commission correspond à 10 % de la première facture payée d’un client admissible. Elle devient payable après 30 jours. Les versements passent par Stripe et dépendent de la vérification de votre compte."
                        : "Earn 10% of an eligible customer's first paid invoice. It becomes payable after 30 days. Payouts use Stripe and depend on account verification.")
                        .font(.system(size: 11.5)).foregroundStyle(MinervaColor.inkFaint).fixedSize(horizontal: false, vertical: true)
                }
                .padding(18)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle(isFrench ? "Ambassadeur" : "Ambassador")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button(isFrench ? "Fermer" : "Done") { dismiss() } } }
            .task {
                isBusy = true
                dashboard = await supabase.fetchFlowAmbassador()
                hasLoaded = true
                isBusy = false
            }
        }
    }

    private var introCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image("LogoMark").resizable().frame(width: 42, height: 42)
            Text(isFrench ? "Faites grandir les restaurants avec nous." : "Help restaurants grow with us.")
                .font(MinervaFont.display(23, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            Text(isFrench
                ? "Partagez Minerva Flow avec des restaurateurs de votre réseau. Votre tableau de bord rassemble recommandations, commissions et versements."
                : "Share Minerva Flow with restaurant owners in your network. Track referrals, commissions and payouts in one place.")
                .font(.system(size: 13)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
        }
        .padding(18).frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private func metrics(_ summary: FlowAmbassadorSummary) -> some View {
        HStack(spacing: 10) {
            metric(value: "\(summary.referrals)", label: isFrench ? "Recommandations" : "Referrals")
            metric(value: summary.code, label: isFrench ? "Votre code" : "Your code")
        }
    }

    private func trackingLinksSection(_ summary: FlowAmbassadorSummary) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            Text(isFrench ? "Liens par vidéo ou publication" : "Links by video or post")
                .font(.system(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            Text(isFrench ? "Un lien distinct mesure ses clics et les inscriptions qui en proviennent. Aucun identifiant publicitaire ou adresse IP n’est conservé." : "Each link tracks its clicks and signups. No advertising identifier or IP address is stored.")
                .font(.system(size: 11.5)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
            TextField(isFrench ? "Nom de la vidéo ou campagne" : "Video or campaign name", text: $trackingLabel)
                .padding(12).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 11))
            Picker(isFrench ? "Plateforme du contenu" : "Content platform", selection: $trackingPlatform) {
                Text("Instagram").tag("instagram"); Text("TikTok").tag("tiktok"); Text("YouTube").tag("youtube")
                Text("LinkedIn").tag("linkedin"); Text("Facebook").tag("facebook"); Text(isFrench ? "Autre" : "Other").tag("other")
            }.tint(MinervaColor.emeraldDark)
            TextField(isFrench ? "Lien public du contenu · facultatif" : "Public content URL · optional", text: $trackingContentUrl)
                .textInputAutocapitalization(.never).keyboardType(.URL).autocorrectionDisabled()
                .padding(12).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 11))
            Button {
                Task {
                    isBusy = true
                    if let refreshed = await supabase.createFlowAmbassadorLink(label: trackingLabel, platform: trackingPlatform, contentUrl: trackingContentUrl) {
                        dashboard = refreshed; trackingLabel = ""; trackingContentUrl = ""
                        message = isFrench ? "Lien Minerva Flow créé." : "Minerva Flow tracking link created."
                    } else { message = isFrench ? "Impossible de créer le lien. Vérifiez les champs." : "Could not create link. Check the fields." }
                    isBusy = false
                }
            } label: {
                if isBusy { ProgressView().tint(.white) }
                else { Label(isFrench ? "Créer un lien traçable" : "Create tracked link", systemImage: "link.badge.plus") }
            }
            .font(.system(size: 12.5, weight: .semibold)).foregroundStyle(.white)
            .frame(maxWidth: .infinity).padding(.vertical, 12).background(MinervaColor.emerald)
            .clipShape(RoundedRectangle(cornerRadius: 12)).disabled(isBusy || trackingLabel.trimmingCharacters(in: .whitespacesAndNewlines).count < 2)
            ForEach(summary.links ?? []) { link in
                HStack(alignment: .center, spacing: 10) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(link.label).font(.system(size: 12, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                        Text(isFrench ? "\(link.clicks) clics · \(link.signups) inscriptions" : "\(link.clicks) clicks · \(link.signups) signups")
                            .font(.system(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
                    }
                    Spacer(minLength: 2)
                    if let url = link.shareURL {
                        ShareLink(item: url) { Image(systemName: "square.and.arrow.up").font(.system(size: 13, weight: .semibold)).padding(9) }
                            .tint(MinervaColor.emeraldDark)
                    }
                }
                .padding(11).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 11))
            }
            Text(isFrench ? "Ajoutez #MinervaFlow à chaque vidéo publiée." : "Add #MinervaFlow to every published video.")
                .font(.system(size: 10.5, weight: .medium)).foregroundStyle(MinervaColor.emeraldDark)
        }
        .padding(14).background(MinervaColor.surface).overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border, lineWidth: 1)).clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func metric(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(value).font(.system(size: 17, weight: .bold, design: .rounded)).foregroundStyle(MinervaColor.emeraldDark).lineLimit(1).minimumScaleFactor(0.7)
            Text(label).font(.system(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
        }.padding(13).frame(maxWidth: .infinity, alignment: .leading)
            .background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func payoutSection(dashboard: FlowAmbassadorDashboard, summary: FlowAmbassadorSummary) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            Text(isFrench ? "Versements" : "Payouts").font(.system(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            Button {
                Task {
                    if let url = await supabase.connectFlowAmbassadorPayouts(locale: isFrench ? "fr" : "en") { openURL(url) }
                    else { message = isFrench ? "Impossible d’ouvrir la configuration Stripe." : "Couldn't open Stripe setup." }
                }
            } label: {
                Label(dashboard.payoutsEnabled
                    ? (isFrench ? "Compte de versement vérifié · Gérer" : "Payout account verified · Manage")
                    : (isFrench ? "Configurer mon compte de versement Stripe" : "Set up my Stripe payout account"),
                    systemImage: dashboard.payoutsEnabled ? "checkmark.circle.fill" : "creditcard")
                    .font(.system(size: 12.5, weight: .medium)).foregroundStyle(MinervaColor.emeraldDark)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(13)
            }.buttonStyle(.plain).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 12))
            if summary.commissions.isEmpty {
                Text(isFrench ? "Vos commissions admissibles apparaîtront ici après le premier paiement d’un client recommandé." : "Eligible commissions will appear here after a referred customer makes their first payment.")
                    .font(.system(size: 12)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
            }
            ForEach(summary.commissions) { commission in
                commissionRow(commission, payoutsEnabled: dashboard.payoutsEnabled)
            }
        }
    }

    private func commissionRow(_ commission: FlowAmbassadorCommission, payoutsEnabled: Bool) -> some View {
        let formatted = commission.amount.formatted(.currency(code: commission.currency).locale(Locale(identifier: isFrench ? "fr_CA" : "en_CA")))
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(formatted).font(.system(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                Text(commission.status == "paid" ? (isFrench ? "Versée" : "Paid") : (isFrench ? "Disponible dès le " : "Available on ") + String(commission.payableAt.prefix(10)))
                    .font(.system(size: 11)).foregroundStyle(MinervaColor.inkFaint)
            }
            Spacer()
            if commission.status == "payable" && payoutsEnabled {
                Button(isFrench ? "Verser" : "Pay") {
                    Task {
                        isBusy = true
                        dashboard = await supabase.requestFlowAmbassadorPayout(commissionId: commission.id)
                        if dashboard == nil { message = isFrench ? "Impossible d’effectuer le versement. Vérifiez Stripe et réessayez." : "Couldn't send the payout. Check Stripe and try again." }
                        isBusy = false
                    }
                }.font(.system(size: 11, weight: .semibold)).disabled(isBusy)
            }
        }.padding(13).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func ugcSection(_ dashboard: FlowAmbassadorDashboard) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("UGC · Contenu avec des restaurants").font(.system(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            Text(isFrench
                ? "Proposez une publication avec un restaurant qui a accepté de participer. Nous vérifions chaque soumission avant toute réutilisation."
                : "Submit a post featuring a restaurant that opted in. We review each submission before reusing it.")
                .font(.system(size: 11.5)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
            if dashboard.profiles.isEmpty {
                Text(isFrench ? "Aucun restaurant participant n’est disponible pour le moment." : "No participating restaurants are available yet.")
                    .font(.system(size: 12)).foregroundStyle(MinervaColor.inkFaint).padding(13)
                    .frame(maxWidth: .infinity, alignment: .leading).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                Picker(isFrench ? "Restaurant participant" : "Participating restaurant", selection: $ugcRestaurantId) {
                    Text(isFrench ? "Choisir un restaurant" : "Choose a restaurant").tag("")
                    ForEach(dashboard.profiles) { profile in
                        Text(profile.city?.isEmpty == false ? "\(profile.name) · \(profile.city!)" : profile.name).tag(profile.id)
                    }
                }
                .tint(MinervaColor.emeraldDark)
                Picker(isFrench ? "Plateforme" : "Platform", selection: $ugcPlatform) {
                    Text("Instagram").tag("instagram")
                    Text("TikTok").tag("tiktok")
                    Text("YouTube").tag("youtube")
                    Text("LinkedIn").tag("linkedin")
                    Text("Facebook").tag("facebook")
                    Text(isFrench ? "Autre" : "Other").tag("other")
                }
                .tint(MinervaColor.emeraldDark)
                if let links = dashboard.summary?.links, !links.isEmpty {
                    Picker(isFrench ? "Lien qui suit cette vidéo" : "Tracking link for this video", selection: $ugcReferralLinkId) {
                        Text(isFrench ? "Aucun lien associé" : "No linked tracking link").tag("")
                        ForEach(links) { link in Text("\(link.label) · \(link.clicks) clics / \(link.signups) inscriptions").tag(link.id) }
                    }
                    .tint(MinervaColor.emeraldDark)
                }
                TextField("https://…", text: $ugcPostUrl)
                    .textInputAutocapitalization(.never).keyboardType(.URL).autocorrectionDisabled()
                    .padding(12).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 11))
                    .accessibilityLabel(isFrench ? "Lien public de la publication" : "Public post link")
                TextField(isFrench ? "Contexte de la publication" : "Post caption or context", text: $ugcCaption, axis: .vertical)
                    .lineLimit(2...5).padding(12).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 11))
                Text(isFrench ? "Ajoutez le tag #MinervaFlow à la légende publiée." : "Include #MinervaFlow in the published caption.")
                    .font(.system(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
                Toggle(isFrench ? "Je divulguerai visiblement toute commission possible." : "I will clearly disclose any potential commission.", isOn: $disclosureConfirmed)
                    .tint(MinervaColor.emerald).font(.system(size: 11.5))
                Toggle(isFrench ? "Je détiens les droits et autorise le repartage après approbation." : "I own the rights and allow reposting after approval.", isOn: $rightsConfirmed)
                    .tint(MinervaColor.emerald).font(.system(size: 11.5))
                Button {
                    Task {
                        isBusy = true
                        if let refreshed = await supabase.submitFlowAmbassadorUgc(restaurantProfileId: ugcRestaurantId, platform: ugcPlatform, postUrl: ugcPostUrl, caption: ugcCaption, referralLinkId: ugcReferralLinkId.isEmpty ? nil : ugcReferralLinkId) {
                            self.dashboard = refreshed
                            message = isFrench ? "Publication envoyée pour vérification." : "Post submitted for review."
                            ugcPostUrl = ""; ugcCaption = "#MinervaFlow"; ugcReferralLinkId = ""; disclosureConfirmed = false; rightsConfirmed = false
                        } else {
                            message = isFrench ? "La soumission a échoué. Vérifiez les champs et réessayez." : "Submission failed. Check the fields and try again."
                        }
                        isBusy = false
                    }
                } label: {
                    if isBusy { ProgressView().tint(.white) }
                    else { Label(isFrench ? "Envoyer pour vérification" : "Submit for review", systemImage: "paperplane.fill") }
                }
                .font(.system(size: 12.5, weight: .semibold)).foregroundStyle(.white)
                .frame(maxWidth: .infinity).padding(.vertical, 12).background(MinervaColor.emerald)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .disabled(isBusy || ugcRestaurantId.isEmpty || !ugcPostUrl.lowercased().hasPrefix("https://") || !ugcCaption.localizedCaseInsensitiveContains("#MinervaFlow") || ugcCaption.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 || !disclosureConfirmed || !rightsConfirmed)
            }
            if !dashboard.submissions.isEmpty {
                Text(isFrench ? "Mes publications" : "My submissions").font(.system(size: 12, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                ForEach(dashboard.submissions) { submission in
                    Button { if let url = URL(string: submission.postUrl) { openURL(url) } } label: {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "play.rectangle.fill").foregroundStyle(MinervaColor.emeraldDark)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(submission.restaurantName) · \(submission.platform.capitalized)").font(.system(size: 12, weight: .medium)).foregroundStyle(MinervaColor.ink)
                                Text(statusLabel(submission.status)).font(.system(size: 10.5, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark)
                                if let note = submission.reviewNote, !note.isEmpty { Text(note).font(.system(size: 11)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true) }
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "arrow.up.right").font(.system(size: 10)).foregroundStyle(MinervaColor.inkFaint)
                        }.padding(12).frame(maxWidth: .infinity, alignment: .leading)
                    }.buttonStyle(.plain).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .padding(15).background(MinervaColor.creamSoft.opacity(0.5)).clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "approved": return isFrench ? "Approuvée" : "Approved"
        case "rejected": return isFrench ? "À corriger" : "Changes requested"
        default: return isFrench ? "En vérification" : "Under review"
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
                            .background(MinervaColor.surface)
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

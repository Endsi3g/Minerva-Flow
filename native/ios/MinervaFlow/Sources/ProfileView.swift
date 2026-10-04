import SwiftUI

/// The customer account tab. A dense home for the account: identity, a shortcut
/// to the loyalty cards, recent points activity, direct links to the settings
/// people reach for most, and one "Autre" entry for everything else.
/// Every destination is a pushed page (NavigationStack path), never a tab or an
/// inline section; deep links such as "cards" open the right page through
/// `DeepLinkRouter.pendingCompteRoute`.
struct ProfileView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @EnvironmentObject var router: DeepLinkRouter
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }
    @State private var path: [CompteRoute] = []
    @State private var showSignOutConfirm = false
    @State private var showEditProfile = false
    @State private var showSurvey = false

    var body: some View {
        NavigationStack(path: $path) {
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
                            header
                            if let error = supabase.lastError {
                                feedbackBanner(icon: "exclamationmark.triangle.fill", title: isFrench ? "Action impossible" : "Action failed", message: error, color: .red)
                            }
                            if let customer = supabase.customer {
                                identityCard(for: customer)
                                cardsShortcut
                                recentActivity
                                shortcuts
                                CompteGroup {
                                    CompteLink(route: .other, icon: "square.grid.2x2.fill", title: isFrench ? "Autre" : "More",
                                               subtitle: isFrench ? "Favoris, commandes, ambassadeur, nouveautés" : "Favourites, orders, ambassador, what's new")
                                }
                                signOutButton
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
            .navigationBarHidden(true)
            .navigationDestination(for: CompteRoute.self) { destination(for: $0) }
        }
        .onAppear(perform: applyPendingRoute)
        .onChange(of: router.pendingCompteRoute) { _, _ in applyPendingRoute() }
        .confirmationDialog(
            isFrench ? "Se déconnecter ?" : "Sign out?",
            isPresented: $showSignOutConfirm,
            titleVisibility: .visible
        ) {
            Button(isFrench ? "Se déconnecter" : "Sign out", role: .destructive) {
                Task { await supabase.signOut() }
            }
            Button(isFrench ? "Annuler" : "Cancel", role: .cancel) {}
        }
        .sheet(isPresented: $showEditProfile) {
            if let customer = supabase.customer {
                EditProfileSheet(customer: customer)
            }
        }
        .sheet(isPresented: $showSurvey) {
            SurveyView()
        }
    }

    private func applyPendingRoute() {
        guard let route = router.pendingCompteRoute else { return }
        path = [route]
        router.pendingCompteRoute = nil
    }

    @ViewBuilder
    private func destination(for route: CompteRoute) -> some View {
        switch route {
        case .cards: MembershipCardsView(embedded: true)
        case .favorites: FavoritesView()
        case .orders: OrderHistoryView()
        case .pointsHistory: PointsHistoryView()
        case .updates: ClientUpdatesView()
        case .appearance: AppearanceSettingsView()
        case .notifications: NotificationSettingsView()
        case .privacy: PrivacyConsentView()
        case .security: SecuritySettingsView()
        case .help: SupportView()
        case .about: AboutView()
        case .ambassador: AmbassadorHubView()
        case .other: OtherView()
        }
    }

    // MARK: - Header

    /// Logo and title share one row so they sit on the same line; the
    /// description goes underneath instead of stretching the title block.
    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .center, spacing: 10) {
                Image("LogoMark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 30, height: 30)
                    .accessibilityHidden(true)
                Text(isFrench ? "Compte" : "Account")
                    .font(MinervaFont.display(28, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                    .accessibilityAddTraits(.isHeader)
                Spacer()
                LanguageMenu(language: Binding(
                    get: { AppLanguage(rawValue: storedLanguage) ?? .fr },
                    set: { storedLanguage = $0.rawValue }
                ), tint: MinervaColor.emeraldDark)
                Menu {
                    Button(isFrench ? "Modifier le profil" : "Edit profile") { showEditProfile = true }
                    Button(isFrench ? "Donner un avis" : "Give feedback") { showSurvey = true }
                    Divider()
                    Button(isFrench ? "Se déconnecter" : "Sign out", role: .destructive) { showSignOutConfirm = true }
                } label: {
                    Image(systemName: "ellipsis.circle.fill")
                        .font(.mv(size: 26))
                        .foregroundStyle(MinervaColor.emerald)
                }
                .accessibilityLabel(isFrench ? "Actions du compte" : "Account actions")
            }
            Text(isFrench ? "Votre compte, vos cartes et vos préférences" : "Your account, cards and preferences")
                .font(.mv(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
        }
    }

    private func feedbackBanner(icon: String, title: String, message: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon).foregroundStyle(color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                Text(message).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Cards shortcut

    private var cardsShortcut: some View {
        let count = supabase.allMemberships.count
        let totalPoints = supabase.allMemberships.reduce(0) { $0 + $1.loyaltyPoints }
        return CompteGroup {
            CompteLink(
                route: .cards,
                icon: "wallet.pass.fill",
                title: isFrench ? "Mes cartes fidélité" : "My loyalty cards",
                subtitle: count > 1
                    ? (isFrench ? "\(count) établissements · \(totalPoints) pts au total" : "\(count) venues · \(totalPoints) pts in total")
                    : (isFrench ? "Votre carte et Apple Wallet" : "Your card and Apple Wallet")
            )
        }
    }

    // MARK: - Recent activity

    /// Same source as Home's "Historique récent": the home establishment's own
    /// movements, including points spent on rewards and manual adjustments.
    private struct ActivityRow: Identifiable {
        let id: String
        let title: String
        let date: Date
        let delta: Int
    }

    private func activityTitle(_ type: String) -> String {
        switch type {
        case "visite": return isFrench ? "Visite" : "Visit"
        case "ajustement": return isFrench ? "Ajustement" : "Adjustment"
        case "echange": return isFrench ? "Récompense échangée" : "Reward redeemed"
        default: return type
        }
    }

    private var recentActivity: some View {
        let rows = supabase.transactions.prefix(4).map {
            ActivityRow(id: $0.id, title: activityTitle($0.type), date: $0.createdAt, delta: $0.pointsDelta)
        }
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(isFrench ? "HISTORIQUE RÉCENT" : "RECENT ACTIVITY")
                    .font(.mv(size: 12, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(MinervaColor.inkFaint)
                    .accessibilityAddTraits(.isHeader)
                Spacer()
                NavigationLink(value: CompteRoute.pointsHistory) {
                    Text(isFrench ? "Voir tout" : "See all")
                        .font(.mv(size: 12.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
            }
            .padding(.horizontal, 4)
            VStack(spacing: 0) {
                if rows.isEmpty {
                    Text(isFrench ? "Vos mouvements de points apparaîtront ici." : "Your points activity will show up here.")
                        .font(.mv(size: 13))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                }
                ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                    HStack(spacing: 12) {
                        Image(systemName: row.delta >= 0 ? "arrow.down.left" : "arrow.up.right")
                            .font(.mv(size: 12, weight: .bold))
                            .foregroundStyle(row.delta >= 0 ? MinervaColor.emeraldDark : Color.red)
                            .frame(width: 30, height: 30)
                            .background((row.delta >= 0 ? MinervaColor.emerald : Color.red).opacity(0.12))
                            .clipShape(Circle())
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.title)
                                .font(.mv(size: 13.5, weight: .medium))
                                .foregroundStyle(MinervaColor.ink)
                                .lineLimit(1)
                            Text(row.date.formatted(.dateTime.locale(Locale(identifier: isFrench ? "fr_CA" : "en_CA")).day().month(.abbreviated).year()))
                                .font(.mv(size: 11.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }
                        Spacer(minLength: 8)
                        Text("\(row.delta >= 0 ? "+" : "")\(row.delta) pts")
                            .font(.mv(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(row.delta >= 0 ? MinervaColor.emeraldDark : Color.red)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .accessibilityElement(children: .combine)
                    if index < rows.count - 1 { CompteSeparator() }
                }
            }
            .background(MinervaColor.creamSoft)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    // MARK: - Direct shortcuts

    private var shortcuts: some View {
        let items: [(CompteRoute, String, String)] = [
            (.help, "questionmark.circle.fill", isFrench ? "Aide" : "Help"),
            (.about, "info.circle.fill", isFrench ? "À propos" : "About"),
            (.security, "lock.shield.fill", isFrench ? "Sécurité" : "Security"),
            (.privacy, "hand.raised.fill", isFrench ? "Confidentialité" : "Privacy"),
            (.notifications, "bell.fill", "Notifications"),
            (.appearance, "paintbrush.fill", isFrench ? "Apparence" : "Appearance"),
        ]
        return VStack(alignment: .leading, spacing: 8) {
            Text(isFrench ? "RACCOURCIS" : "SHORTCUTS")
                .font(.mv(size: 12, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(MinervaColor.inkFaint)
                .padding(.horizontal, 4)
                .accessibilityAddTraits(.isHeader)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                ForEach(items, id: \.0) { route, icon, title in
                    NavigationLink(value: route) {
                        HStack(spacing: 10) {
                            Image(systemName: icon)
                                .font(.mv(size: 14, weight: .semibold))
                                .foregroundStyle(MinervaColor.emeraldDark)
                                .frame(width: 30, height: 30)
                                .background(MinervaColor.emerald.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 9))
                                .accessibilityHidden(true)
                            Text(title)
                                .font(.mv(size: 13.5, weight: .semibold))
                                .foregroundStyle(MinervaColor.ink)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                            Spacer(minLength: 0)
                        }
                        .padding(12)
                        .background(MinervaColor.creamSoft)
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(MinervaColor.border, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var brandFooter: some View {
        HStack(spacing: 8) {
            Image("LogoMark")
                .resizable()
                .frame(width: 24, height: 24)
            Text("Minerva Flow")
                .font(.mv(size: 11, weight: .semibold))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
        .padding(.bottom, 16)
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
                        .font(.mv(size: 12))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                if let restaurantName = supabase.restaurantName {
                    Text(restaurantName)
                        .font(.mv(size: 12.5))
                        .foregroundStyle(MinervaColor.inkSoft)
                }
            }

            Button {
                showEditProfile = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "pencil")
                    Text(isFrench ? "Modifier le profil" : "Edit profile")
                }
                .font(.mv(size: 12, weight: .semibold))
            }
            .foregroundStyle(MinervaColor.emeraldDark)
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(MinervaColor.emerald.opacity(0.12))
            .clipShape(Capsule())
            .buttonStyle(PressableButtonStyle())

            HStack(spacing: 22) {
                statTile(value: "\(customer.loyaltyPoints)", label: "points")
                statTile(value: "\(customer.visitCount)", label: isFrench ? "visites" : "visits")
                statTile(value: tier.label, label: isFrench ? "statut" : "status")
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    private func avatarPlaceholder(tier: LoyaltyTier, customer: Customer) -> some View {
        ZStack {
            Circle().fill(tier.bannerColor)
            Text(initials(for: customer.name))
                .font(.mv(size: 20, weight: .bold))
                .foregroundStyle(tier.bannerForeground)
        }
    }

    private func statTile(value: String, label: String) -> some View {
        VStack(spacing: 1) {
            Text(value)
                .font(.mv(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(MinervaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.mv(size: 10.5))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(minWidth: 56)
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap { $0.first }
        return String(letters).uppercased()
    }

    // MARK: - Sign out

    private var signOutButton: some View {
        Button {
            showSignOutConfirm = true
        } label: {
            Text(isFrench ? "Se déconnecter" : "Sign out")
                .font(.mv(size: 14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
        }
        .foregroundStyle(.red)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.red.opacity(0.3)))
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
                                    .font(.mv(size: 14, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                            }
                            .tint(.white)
                            .background(MinervaColor.emerald)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            Text(url.absoluteString)
                                .font(.mv(size: 11, design: .monospaced))
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
                        .font(.mv(size: 14, weight: .semibold))
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
                        Text(message).font(.mv(size: 12)).foregroundStyle(.red).fixedSize(horizontal: false, vertical: true)
                    }
                    Text(isFrench
                        ? "La commission correspond à 10 % de la première facture payée d’un client admissible. Elle devient payable après 30 jours. Les versements se gèrent sur le web et dépendent de la vérification de votre compte."
                        : "Earn 10% of an eligible customer's first paid invoice. It becomes payable after 30 days. Payouts are managed on the web and depend on account verification.")
                        .font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkFaint).fixedSize(horizontal: false, vertical: true)
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
                .font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
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
                .font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            Text(isFrench ? "Un lien distinct mesure ses clics et les inscriptions qui en proviennent. Aucun identifiant publicitaire ou adresse IP n’est conservé." : "Each link tracks its clicks and signups. No advertising identifier or IP address is stored.")
                .font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
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
            .font(.mv(size: 12.5, weight: .semibold)).foregroundStyle(.white)
            .frame(maxWidth: .infinity).padding(.vertical, 12).background(MinervaColor.emerald)
            .clipShape(RoundedRectangle(cornerRadius: 12)).disabled(isBusy || trackingLabel.trimmingCharacters(in: .whitespacesAndNewlines).count < 2)
            ForEach(summary.links ?? []) { link in
                HStack(alignment: .center, spacing: 10) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(link.label).font(.mv(size: 12, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                        Text(isFrench ? "\(link.clicks) clics · \(link.signups) inscriptions" : "\(link.clicks) clicks · \(link.signups) signups")
                            .font(.mv(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
                    }
                    Spacer(minLength: 2)
                    if let url = link.shareURL {
                        ShareLink(item: url) { Image(systemName: "square.and.arrow.up").font(.mv(size: 13, weight: .semibold)).padding(9) }
                            .tint(MinervaColor.emeraldDark)
                    }
                }
                .padding(11).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 11))
            }
            Text(isFrench ? "Ajoutez #MinervaFlow à chaque vidéo publiée." : "Add #MinervaFlow to every published video.")
                .font(.mv(size: 10.5, weight: .medium)).foregroundStyle(MinervaColor.emeraldDark)
        }
        .padding(14).background(MinervaColor.surface).overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border, lineWidth: 1)).clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func metric(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(value).font(.mv(size: 17, weight: .bold, design: .rounded)).foregroundStyle(MinervaColor.emeraldDark).lineLimit(1).minimumScaleFactor(0.7)
            Text(label).font(.mv(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
        }.padding(13).frame(maxWidth: .infinity, alignment: .leading)
            .background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func payoutSection(dashboard: FlowAmbassadorDashboard, summary: FlowAmbassadorSummary) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            Text(isFrench ? "Versements" : "Payouts").font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            // Payout onboarding and transfers live on the web app: identity
            // verification and bank details stay off the native binary.
            Button {
                openURL(Config.apiBaseURL.appending(path: "/workspace"))
            } label: {
                Label(dashboard.payoutsEnabled
                    ? (isFrench ? "Compte de versement vérifié · Gérer sur le web" : "Payout account verified · Manage on the web")
                    : (isFrench ? "Configurer mes versements sur le web" : "Set up my payouts on the web"),
                    systemImage: dashboard.payoutsEnabled ? "checkmark.circle.fill" : "arrow.up.right.square")
                    .font(.mv(size: 12.5, weight: .medium)).foregroundStyle(MinervaColor.emeraldDark)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(13)
            }.buttonStyle(.plain).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 12))
            if summary.commissions.isEmpty {
                Text(isFrench ? "Vos commissions admissibles apparaîtront ici après le premier paiement d’un client recommandé." : "Eligible commissions will appear here after a referred customer makes their first payment.")
                    .font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
            }
            ForEach(summary.commissions) { commission in
                commissionRow(commission)
            }
        }
    }

    private func commissionRow(_ commission: FlowAmbassadorCommission) -> some View {
        let formatted = commission.amount.formatted(.currency(code: commission.currency).locale(Locale(identifier: isFrench ? "fr_CA" : "en_CA")))
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(formatted).font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                Text(commission.status == "paid" ? (isFrench ? "Versée" : "Paid") : (isFrench ? "Disponible dès le " : "Available on ") + String(commission.payableAt.prefix(10)))
                    .font(.mv(size: 11)).foregroundStyle(MinervaColor.inkFaint)
            }
            Spacer()
        }.padding(13).background(MinervaColor.creamSoft).clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func ugcSection(_ dashboard: FlowAmbassadorDashboard) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("UGC · Contenu avec des restaurants").font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            Text(isFrench
                ? "Proposez une publication avec un restaurant qui a accepté de participer. Nous vérifions chaque soumission avant toute réutilisation."
                : "Submit a post featuring a restaurant that opted in. We review each submission before reusing it.")
                .font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
            if dashboard.profiles.isEmpty {
                Text(isFrench ? "Aucun restaurant participant n’est disponible pour le moment." : "No participating restaurants are available yet.")
                    .font(.mv(size: 12)).foregroundStyle(MinervaColor.inkFaint).padding(13)
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
                    .font(.mv(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
                Toggle(isFrench ? "Je divulguerai visiblement toute commission possible." : "I will clearly disclose any potential commission.", isOn: $disclosureConfirmed)
                    .tint(MinervaColor.emerald).font(.mv(size: 11.5))
                Toggle(isFrench ? "Je détiens les droits et autorise le repartage après approbation." : "I own the rights and allow reposting after approval.", isOn: $rightsConfirmed)
                    .tint(MinervaColor.emerald).font(.mv(size: 11.5))
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
                .font(.mv(size: 12.5, weight: .semibold)).foregroundStyle(.white)
                .frame(maxWidth: .infinity).padding(.vertical, 12).background(MinervaColor.emerald)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .disabled(isBusy || ugcRestaurantId.isEmpty || !ugcPostUrl.lowercased().hasPrefix("https://") || !ugcCaption.localizedCaseInsensitiveContains("#MinervaFlow") || ugcCaption.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 || !disclosureConfirmed || !rightsConfirmed)
            }
            if !dashboard.submissions.isEmpty {
                Text(isFrench ? "Mes publications" : "My submissions").font(.mv(size: 12, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                ForEach(dashboard.submissions) { submission in
                    Button { if let url = URL(string: submission.postUrl) { openURL(url) } } label: {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "play.rectangle.fill").foregroundStyle(MinervaColor.emeraldDark)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(submission.restaurantName) · \(submission.platform.capitalized)").font(.mv(size: 12, weight: .medium)).foregroundStyle(MinervaColor.ink)
                                Text(statusLabel(submission.status)).font(.mv(size: 10.5, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark)
                                if let note = submission.reviewNote, !note.isEmpty { Text(note).font(.mv(size: 11)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true) }
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "arrow.up.right").font(.mv(size: 10)).foregroundStyle(MinervaColor.inkFaint)
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
                        .font(.mv(size: 13))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Tapez « SUPPRIMER » pour confirmer")
                            .font(.mv(size: 11.5, weight: .semibold))
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
                            .font(.mv(size: 12.5))
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
                                .font(.mv(size: 14, weight: .semibold))
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

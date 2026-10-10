import SwiftUI

/// Reminder shown once, full screen, the very first time an owner opens the
/// app: the full restaurant setup happens on the web, the app is for daily use.
/// It is marked as seen when it appears, so a second launch never shows it.
struct OwnerWebSetupNotice: View {
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let onContinue: () -> Void
    private var L: Lx { Lx(storedLanguage) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack(spacing: 10) {
                    Image("LogoMark").resizable().scaledToFit().frame(width: 32, height: 32)
                    Text("Minerva Flow").font(MinervaFont.display(22, weight: .semibold))
                }
                VStack(alignment: .leading, spacing: 10) {
                    Text(L("Configurez votre compte sur le web", "Set up your account on the web"))
                        .font(MinervaFont.display(32, weight: .semibold)).fixedSize(horizontal: false, vertical: true)
                    Text(L("Depuis un ordinateur, terminez la configuration de votre établissement. Cette application sert ensuite à gérer votre journée.",
                           "From a computer, finish setting up your restaurant. This app is then for running your day."))
                        .font(.mv(size: 16)).foregroundStyle(MinervaColor.inkSoft)
                }
                OwnerCard(padding: 6) {
                    VStack(spacing: 0) {
                        step("fork.knife", L("Menu et prix", "Menu and prices"), L("Catégories, photos, allergènes", "Categories, photos, allergens"))
                        OwnerDivider()
                        step("clock.fill", L("Heures et emplacements", "Hours and locations"), L("Quand et où vos clients vous trouvent", "When and where guests find you"))
                        OwnerDivider()
                        step("heart.text.square.fill", L("Récompenses et offres", "Rewards and offers"), L("Votre programme de fidélité", "Your loyalty program"))
                        OwnerDivider()
                        step("creditcard.and.123", L("Caisse (POS)", "Point of sale"), L("Connectez Clover, Square ou une autre caisse", "Connect Clover, Square or another POS"))
                    }
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(L("Adresse à ouvrir sur votre ordinateur", "Address to open on your computer")).font(.mv(size: 12.5)).foregroundStyle(MinervaColor.inkSoft)
                    Text(Config.publicLinkBaseURL.absoluteString.replacingOccurrences(of: "https://", with: ""))
                        .font(.mv(size: 17, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark).textSelection(.enabled)
                }
                VStack(spacing: 10) {
                    Button(L("J'ai compris", "Got it"), action: onContinue).buttonStyle(OwnerPrimaryButtonStyle())
                    ShareLink(item: Config.publicLinkBaseURL, message: Text(L("Mon espace Minerva Flow", "My Minerva Flow workspace"))) {
                        Label(L("M'envoyer le lien", "Send me the link"), systemImage: "square.and.arrow.up")
                    }.buttonStyle(OwnerSecondaryButtonStyle())
                }
            }
            .padding(24).padding(.top, 12).frame(maxWidth: 560).frame(maxWidth: .infinity)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .foregroundStyle(MinervaColor.ink)
        .interactiveDismissDisabled()
    }

    private func step(_ icon: String, _ title: String, _ subtitle: String) -> some View {
        OwnerRow(icon: icon, title: title, subtitle: subtitle, chevron: false).padding(.horizontal, 10).padding(.vertical, 4)
    }
}

struct OwnerAccountScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var showSignOut = false
    @State private var showWebSetup = false
    @State private var showDeleteAccount = false
    private var L: Lx { Lx(storedLanguage) }
    private var email: String { supabase.client.auth.currentUser?.email ?? "" }

    var body: some View {
        NavigationStack {
            OwnerScreen(title: L("Compte", "Account"), showsLocationMenu: false, refreshable: false) {
                OwnerCard {
                    HStack(spacing: 14) {
                        Text(String((email.first ?? "M").uppercased()))
                            .font(MinervaFont.display(24, weight: .semibold)).foregroundStyle(.white)
                            .frame(width: 56, height: 56).background(MinervaColor.emeraldDeep, in: Circle())
                        VStack(alignment: .leading, spacing: 3) {
                            Text(supabase.selectedOwnerRestaurant?.name ?? "Minerva Flow").font(.mv(size: 17, weight: .semibold)).lineLimit(2)
                            Text(email).font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft).lineLimit(1)
                            OwnerPill(text: L("Propriétaire", "Owner"), tone: .good)
                        }
                        Spacer(minLength: 0)
                    }
                }
                group(L("Votre espace", "Your workspace")) {
                    Link(destination: Config.publicLinkBaseURL) {
                        OwnerRow(icon: "safari.fill", title: L("Ouvrir l'application web", "Open the web app"),
                                 subtitle: L("Configuration complète depuis un ordinateur", "Full setup from a computer"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                    OwnerDivider()
                    Button { showWebSetup = true } label: {
                        OwnerRow(icon: "checklist", title: L("Que configurer sur le web ?", "What to set up on the web?"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                    OwnerDivider()
                    Button { Task { await supabase.openCustomerWorkspace() } } label: {
                        OwnerRow(icon: "person.crop.circle.fill", title: L("Espace client", "Customer space"),
                                 subtitle: L("Vos cartes, récompenses et commandes personnelles", "Your own cards, rewards and orders"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                }
                group(L("Suivi", "Insights")) {
                    NavigationLink { OwnerStatisticsScreen() } label: {
                        OwnerRow(icon: "chart.line.uptrend.xyaxis", title: L("Statistiques", "Statistics"),
                                 subtitle: L("Fidélité, meilleurs articles, heures de pointe", "Loyalty, best sellers, busiest hours"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                }
                group(L("Préférences et aide", "Preferences and help")) {
                    NavigationLink { OwnerSettingsView() } label: {
                        OwnerRow(icon: "slider.horizontal.3", title: L("Paramètres", "Settings"), subtitle: L("Apparence, notifications, suppression du compte", "Appearance, notifications, account deletion"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                    OwnerDivider()
                    NavigationLink { NativeChangelogView(audience: "owner") } label: {
                        OwnerRow(icon: "sparkles", title: L("Mises à jour", "Updates"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                    OwnerDivider()
                    NavigationLink { SupportView() } label: {
                        OwnerRow(icon: "lifepreserver.fill", title: L("Aide et support", "Help and support"), subtitle: L("Nous écrire, documents légaux", "Contact us, legal documents"), chevron: true).padding(.horizontal, 10).padding(.vertical, 4)
                    }.buttonStyle(.plain)
                }
                Button(role: .destructive) { showSignOut = true } label: {
                    Label(L("Se déconnecter", "Sign out"), systemImage: "rectangle.portrait.and.arrow.right")
                }
                .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.bad.color))
                // Apple 5.1.1(v): account deletion must start inside the app.
                Button(role: .destructive) { showDeleteAccount = true } label: {
                    Text(L("Supprimer mon compte", "Delete my account")).font(.mv(size: 13, weight: .medium))
                }
                .foregroundStyle(OwnerTone.bad.color)
                .frame(maxWidth: .infinity, minHeight: 36)
            }
            .sheet(isPresented: $showDeleteAccount) { DeleteAccountSheet(isOwner: true).environmentObject(supabase) }
            .confirmationDialog(L("Se déconnecter ?", "Sign out?"), isPresented: $showSignOut, titleVisibility: .visible) {
                Button(L("Se déconnecter", "Sign out"), role: .destructive) { Task { await supabase.signOut() } }
                Button(L("Annuler", "Cancel"), role: .cancel) {}
            }
            .sheet(isPresented: $showWebSetup) {
                OwnerWebSetupNotice { showWebSetup = false }
            }
        }
    }

    private func group<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: title)
            OwnerCard(padding: 6) { VStack(spacing: 0) { content() } }
        }
    }
}

import SwiftUI

/// "Autre": customer activity and extras that do not belong to the dedicated
/// account settings group on the Compte page.
struct OtherView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var showSurvey = false
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    private var favoritesCount: Int {
        (supabase.customer?.favoriteMenuItemIds.count ?? 0) + (supabase.customer?.favoriteOfferIds.count ?? 0)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(isFrench ? "Autre" : "More")
                        .font(MinervaFont.display(30, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .accessibilityAddTraits(.isHeader)
                    Text(isFrench ? "Vos favoris, vos commandes, votre statut ambassadeur et les nouveautés." : "Your favourites, orders, ambassador status and what's new.")
                        .font(.mv(size: 14))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }

                CompteGroup(title: isFrench ? "MES ACTIVITÉS" : "MY ACTIVITY") {
                    CompteLink(route: .favorites, icon: "heart.fill", title: isFrench ? "Mes favoris" : "My favourites",
                               subtitle: isFrench ? "Plats et offres, établissement par établissement" : "Dishes and offers, by establishment",
                               trailing: favoritesCount > 0 ? "\(favoritesCount)" : nil, tint: .red)
                    CompteSeparator()
                    CompteLink(route: .orders, icon: "bag.fill", title: isFrench ? "Mes commandes" : "My orders",
                               subtitle: isFrench ? "Vos achats récents" : "Your recent purchases")
                }

                CompteGroup(title: isFrench ? "PROGRAMME" : "PROGRAMME") {
                    CompteLink(route: .ambassador, icon: "megaphone.fill", title: isFrench ? "Ambassadeur" : "Ambassador",
                               subtitle: isFrench ? "Recommandez Minerva Flow et suivez vos récompenses" : "Recommend Minerva Flow and track your rewards")
                    CompteSeparator()
                    CompteLink(route: .updates, icon: "sparkles", title: isFrench ? "Nouveautés" : "What's new",
                               subtitle: isFrench ? "Ce qui change pour vous" : "What changes for you")
                }

                CompteGroup(title: isFrench ? "AIDE" : "HELP") {
                    CompteLink(route: .help, icon: "questionmark.circle.fill", title: isFrench ? "Aide" : "Help",
                               subtitle: isFrench ? "Contacter l’équipe Minerva Flow" : "Contact the Minerva Flow team")
                    CompteSeparator()
                    CompteLink(route: .about, icon: "info.circle.fill", title: isFrench ? "À propos" : "About")
                }

                CompteGroup(title: isFrench ? "VOTRE AVIS" : "FEEDBACK") {
                    Button { showSurvey = true } label: {
                        CompteRowLabel(icon: "star.bubble.fill", title: isFrench ? "Donner un avis" : "Give feedback",
                                       subtitle: isFrench ? "Dites-nous ce que vous pensez de l'application" : "Tell us what you think of the app")
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Autre" : "More")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showSurvey) { SurveyView() }
    }
}

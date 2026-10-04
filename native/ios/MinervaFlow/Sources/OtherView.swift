import SwiftUI

/// "Autre": everything in the customer account that is not a daily shortcut,
/// laid out as dense, labelled groups instead of one long flat list.
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

                CompteGroup(title: isFrench ? "MON ACTIVITÉ" : "MY ACTIVITY") {
                    CompteLink(route: .favorites, icon: "heart.fill", title: isFrench ? "Mes favoris" : "My favourites",
                               subtitle: isFrench ? "Plats et offres, établissement par établissement" : "Dishes and offers, by establishment",
                               trailing: favoritesCount > 0 ? "\(favoritesCount)" : nil, tint: .red)
                    CompteSeparator()
                    CompteLink(route: .orders, icon: "bag.fill", title: isFrench ? "Mes commandes" : "My orders",
                               subtitle: isFrench ? "Votre historique d'achats" : "Your purchase history")
                    CompteSeparator()
                    CompteLink(route: .pointsHistory, icon: "clock.arrow.circlepath", title: isFrench ? "Historique de points" : "Points history",
                               subtitle: isFrench ? "Points gagnés, dépensés et ajustements" : "Points earned, spent and adjusted",
                               trailing: supabase.customer.map { "\($0.loyaltyPoints) pts" })
                }

                CompteGroup(title: isFrench ? "PROGRAMME" : "PROGRAMME") {
                    CompteLink(route: .ambassador, icon: "megaphone.fill", title: isFrench ? "Ambassadeur" : "Ambassador",
                               subtitle: isFrench ? "Recommandez Minerva Flow et suivez vos récompenses" : "Recommend Minerva Flow and track your rewards")
                    CompteSeparator()
                    CompteLink(route: .updates, icon: "sparkles", title: isFrench ? "Nouveautés" : "What's new",
                               subtitle: isFrench ? "Ce qui change pour vous" : "What changes for you")
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

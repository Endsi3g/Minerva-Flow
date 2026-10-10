import SwiftUI

/// Completes only an existing, authorized restaurant. No inferred café name.
struct NativeOwnerOnboardingView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var language = AppLanguage.fr.rawValue
    let onComplete: () -> Void
    @State private var restaurantName = ""
    @State private var goals: [String] = []
    @State private var sizeBand: String?
    @State private var posSystem: String?
    @State private var isSaving = false
    @State private var errorMessage: String?
    private var isFrench: Bool { language == AppLanguage.fr.rawValue }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack {
                    Image("LogoMark").resizable().scaledToFit().frame(width: 32, height: 32)
                    Text("Minerva Flow").font(.mv(size: 20, weight: .semibold))
                    Spacer()
                    LanguageMenu(language: Binding(get: { AppLanguage(rawValue: language) ?? .fr }, set: { language = $0.rawValue }), tint: MinervaColor.emeraldDark)
                }
                VStack(alignment: .leading, spacing: 10) {
                    Text(isFrench ? "Votre établissement,\nvotre espace." : "Your restaurant,\nyour workspace.")
                        .font(MinervaFont.display(32, weight: .semibold))
                    Text(isFrench ? "Votre compte retrouve les mêmes données que le portail web. Confirmez le nom officiel de l’établissement auquel vous avez accès." : "Your account uses the same data as the web portal. Confirm the official name of the restaurant you can manage.")
                        .font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                }
                CompteGroup(title: isFrench ? "ÉTABLISSEMENT" : "RESTAURANT") {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(isFrench ? "Nom officiel complet" : "Full official name").font(.mv(size: 14, weight: .semibold))
                        TextField(isFrench ? "Nom de votre établissement" : "Your restaurant name", text: $restaurantName)
                            .font(.mv(size: 16)).textInputAutocapitalization(.words).submitLabel(.done)
                        Rectangle().fill(MinervaColor.border).frame(height: 1)
                        if let city = supabase.selectedOwnerRestaurant?.city, !city.isEmpty {
                            Label(city, systemImage: "mappin.and.ellipse").font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft)
                        }
                    }.padding(18)
                }
                qualification
                if let errorMessage { Label(errorMessage, systemImage: "exclamationmark.circle").font(.mv(size: 13)).foregroundStyle(.red) }
                Button { Task { await save() } } label: {
                    HStack {
                        if isSaving { ProgressView().tint(.white) }
                        Text(isSaving ? (isFrench ? "Enregistrement…" : "Saving…") : (isFrench ? "Ouvrir mon espace" : "Open my workspace"))
                            .font(.mv(size: 15, weight: .semibold))
                    }.frame(maxWidth: .infinity).padding(.vertical, 17).foregroundStyle(.white)
                        .background(MinervaColor.emeraldDark, in: Capsule())
                }.buttonStyle(PressableButtonStyle()).disabled(isSaving || restaurantName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                Button { Task { await supabase.openCustomerWorkspace() } } label: {
                    Text(isFrench ? "Retour à l’espace client" : "Back to the customer space").font(.mv(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                }.buttonStyle(.plain).foregroundStyle(MinervaColor.emeraldDark)
            }.padding(24).padding(.top, 12).frame(maxWidth: 540).frame(maxWidth: .infinity)
        }.background(MinervaColor.cream.ignoresSafeArea()).foregroundStyle(MinervaColor.ink)
            .scrollDismissesKeyboard(.interactively)
            .onAppear {
                Analytics.capture("onboarding_step_viewed", ["step": 1, "total_steps": 1, "step_name": "restaurant_name", "platform": "ios"])
                let name = supabase.selectedOwnerRestaurant?.name ?? ""
                restaurantName = ["mon restaurant", "minerva flow"].contains(name.lowercased()) ? "" : name
            }
    }

    // Same three questions as the web onboarding, optional here (the name is the only requirement).
    private var qualification: some View {
        CompteGroup(title: isFrench ? "VOTRE PRIORITÉ" : "YOUR PRIORITY") {
            VStack(alignment: .leading, spacing: 14) {
                Text(isFrench ? "Qu'est-ce qui compte le plus ? (jusqu'à 2)" : "What matters most? (up to 2)").font(.mv(size: 14, weight: .semibold))
                chips([("retention", isFrench ? "Faire revenir mes clients" : "Bring customers back"),
                       ("basket", isFrench ? "Augmenter le panier moyen" : "Increase the basket"),
                       ("quiet_hours", isFrench ? "Remplir les heures creuses" : "Fill quiet hours"),
                       ("time_saving", isFrench ? "Gagner du temps" : "Save time")],
                      isSelected: { goals.contains($0) }) { id in
                    if goals.contains(id) { goals.removeAll { $0 == id } }
                    else { goals = goals.count >= 2 ? [goals[1], id] : goals + [id] }
                }
                Text(isFrench ? "Combien d'établissements ?" : "How many locations?").font(.mv(size: 14, weight: .semibold))
                chips([("1", isFrench ? "Un seul" : "Just one"), ("2-5", isFrench ? "2 à 5" : "2 to 5"), ("6+", isFrench ? "6 ou plus" : "6 or more")],
                      isSelected: { sizeBand == $0 }) { sizeBand = sizeBand == $0 ? nil : $0 }
                Text(isFrench ? "Votre caisse" : "Your point of sale").font(.mv(size: 14, weight: .semibold))
                chips([("square", "Square"), ("clover", "Clover"), ("lightspeed", "Lightspeed"),
                       ("other", isFrench ? "Une autre" : "Another"), ("none", isFrench ? "Aucune" : "None")],
                      isSelected: { posSystem == $0 }) { posSystem = posSystem == $0 ? nil : $0 }
            }.padding(18)
        }
    }

    private func chips(_ options: [(String, String)], isSelected: @escaping (String) -> Bool, toggle: @escaping (String) -> Void) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(options, id: \.0) { option in
                let selected = isSelected(option.0)
                Button { toggle(option.0) } label: {
                    Text(option.1).font(.mv(size: 13, weight: .medium)).multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity, minHeight: 38)
                        .foregroundStyle(selected ? .white : MinervaColor.ink)
                        .background(selected ? MinervaColor.emeraldDark : MinervaColor.creamSoft, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(MinervaColor.border, lineWidth: selected ? 0 : 1))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
    }

    private func saveQualification() async {
        Analytics.capture("onboarding_qualified", ["goals": goals, "locations_band": sizeBand ?? "", "pos_system": posSystem ?? "", "platform": "ios"])
        guard let restaurantId = supabase.selectedOwnerRestaurantId, let userId = supabase.authUserID?.uuidString.lowercased() else { return }
        struct Row: Encodable {
            let userId: String; let restaurantId: String; let goals: [String]
            let locationsBand: String?; let posSystem: String?; let platform: String
            enum CodingKeys: String, CodingKey {
                case goals, platform
                case userId = "user_id", restaurantId = "restaurant_id", locationsBand = "locations_band", posSystem = "pos_system"
            }
        }
        // Best effort: a failed answer never blocks reaching the restaurant.
        _ = try? await supabase.client.from("owner_onboarding_responses")
            .upsert(Row(userId: userId, restaurantId: restaurantId, goals: goals, locationsBand: sizeBand, posSystem: posSystem, platform: "ios"), onConflict: "user_id,restaurant_id")
            .execute()
    }

    private func save() async {
        isSaving = true; errorMessage = nil
        defer { isSaving = false }
        if await supabase.updateOwnerRestaurantName(restaurantName) {
            await saveQualification()
            Analytics.capture("onboarding_completed", ["platform": "ios"])
            onComplete()
        }
        else { errorMessage = supabase.lastError ?? (isFrench ? "Réessayez dans un instant." : "Try again shortly.") }
    }
}

import SwiftUI

/// Completes only an existing, authorized restaurant. No inferred café name.
struct NativeOwnerOnboardingView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var language = AppLanguage.fr.rawValue
    let onComplete: () -> Void
    @State private var restaurantName = ""
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

    private func save() async {
        isSaving = true; errorMessage = nil
        defer { isSaving = false }
        if await supabase.updateOwnerRestaurantName(restaurantName) {
            Analytics.capture("onboarding_completed", ["platform": "ios"])
            onComplete()
        }
        else { errorMessage = supabase.lastError ?? (isFrench ? "Réessayez dans un instant." : "Try again shortly.") }
    }
}

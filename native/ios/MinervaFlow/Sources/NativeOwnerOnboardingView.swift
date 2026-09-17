import SwiftUI

/// Required first-run setup for owner accounts. Existing restaurants with a
/// real name are recognized by RootView and go straight to the dashboard.
struct NativeOwnerOnboardingView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    let onComplete: () -> Void
    @State private var restaurantName = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.91, green: 0.96, blue: 0.91), Color.white], startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Image(systemName: "storefront.fill")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(Color(red: 0.09, green: 0.50, blue: 0.36))
                        .padding(.top, 30)
                    Text("Configurez votre établissement")
                        .font(.system(.largeTitle, design: .serif).weight(.bold))
                        .foregroundStyle(.primary)
                    Text("Avant d’ouvrir votre tableau de bord, indiquez le nom réel de votre restaurant ou café.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Nom du restaurant ou café")
                            .font(.subheadline.weight(.semibold))
                        TextField("Ex. Café Lucide", text: $restaurantName)
                            .textInputAutocapitalization(.words)
                            .textFieldStyle(.roundedBorder)
                    }
                    if let errorMessage {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }
                    Button {
                        Task { await save() }
                    } label: {
                        HStack {
                            if isSaving { ProgressView().tint(.white) }
                            Text(isSaving ? "Enregistrement…" : "Accéder au tableau de bord")
                        }
                        .frame(maxWidth: .infinity).padding(.vertical, 15)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 0.09, green: 0.50, blue: 0.36))
                    .disabled(isSaving || restaurantName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Spacer(minLength: 24)
                }
                .padding(.horizontal, 24)
            }
        }
        .onAppear { restaurantName = supabase.selectedOwnerRestaurant?.name == "Mon restaurant" ? "" : (supabase.selectedOwnerRestaurant?.name ?? "") }
    }

    private func save() async {
        isSaving = true; errorMessage = nil
        if await supabase.updateOwnerRestaurantName(restaurantName) { onComplete() }
        else { errorMessage = supabase.lastError ?? "Réessayez dans un instant." }
        isSaving = false
    }
}

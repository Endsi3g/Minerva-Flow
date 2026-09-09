import SwiftUI

/// Native customer-facing survey — rating + free-text, delivered by email
/// only (app/api/portal/survey/route.ts), no dedicated table. Reachable
/// from ProfileView's "Donner votre avis" row, and shown once per new
/// build via MainTabView's version-bump check.
struct SurveyView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    @State private var rating = 0
    @State private var comment = ""
    @State private var isSubmitting = false
    @State private var submitError: String?
    @State private var didSubmit = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    if didSubmit {
                        confirmation
                    } else {
                        form
                    }
                }
                .padding(20)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Donner votre avis")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(didSubmit ? "Fermer" : "Annuler") { dismiss() }
                }
            }
        }
    }

    private var form: some View {
        VStack(spacing: 20) {
            VStack(spacing: 6) {
                Text("Comment trouvez-vous l'application ?")
                    .font(MinervaFont.display(18))
                    .foregroundStyle(MinervaColor.ink)
                    .multilineTextAlignment(.center)
                Text("Votre réponse est envoyée directement à l'équipe Minerva Flow.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
            }

            HStack(spacing: 10) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        rating = star
                    } label: {
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 30))
                            .foregroundStyle(MinervaColor.emerald)
                    }
                    .accessibilityLabel("Note \(star) étoile\(star > 1 ? "s" : "")")
                }
            }
            .padding(.vertical, 4)

            TextField("Un commentaire à ajouter ? (optionnel)", text: $comment, axis: .vertical)
                .lineLimit(5, reservesSpace: true)
                .padding(12)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 11))
                .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))

            if let submitError {
                Text(submitError)
                    .font(.system(size: 12.5))
                    .foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Button {
                Task { await submit() }
            } label: {
                HStack {
                    if isSubmitting { ProgressView().tint(.white) }
                    Text(isSubmitting ? "Envoi…" : "Envoyer")
                        .font(.system(size: 14, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
            }
            .background(rating == 0 ? MinervaColor.emerald.opacity(0.4) : MinervaColor.emerald)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .buttonStyle(PressableButtonStyle())
            .disabled(isSubmitting || rating == 0)
        }
    }

    private var confirmation: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 44))
                .foregroundStyle(MinervaColor.emerald)
            Text("Merci pour votre retour !")
                .font(MinervaFont.display(18))
                .foregroundStyle(MinervaColor.ink)
            Text("Votre avis a bien été transmis.")
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
        }
        .padding(.top, 40)
    }

    private func submit() async {
        isSubmitting = true
        submitError = nil
        let ok = await supabase.submitSurvey(rating: rating, comment: comment)
        isSubmitting = false
        if ok {
            withAnimation { didSubmit = true }
        } else {
            submitError = "L'envoi a échoué. Réessayez."
        }
    }
}

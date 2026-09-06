import SwiftUI

/// Direct replica of the real web portal login (app/[locale]/portal/login/
/// page.tsx) — centered logo + wordmark above a bordered card, "Espace
/// client" title, same copy tone, same cream background. The only real
/// difference from the web: native uses a typed 6-digit code instead of a
/// tapped magic link (deep-linking a link back into a native app is more
/// friction-prone than typing 6 digits) — everything else, including the
/// consent checkboxes ported from the Starbucks sign-up reference, follows
/// the web's actual visual language, not an invented one.
struct AuthView: View {
    @EnvironmentObject var supabase: SupabaseManager

    @State private var email = ""
    @State private var code = ""
    @State private var step: Step = .email
    @State private var acceptedTerms = false
    @State private var marketingOptIn = true
    @State private var isBusy = false
    @State private var errorMessage: String?

    enum Step { case email, code }

    var body: some View {
        ZStack {
            MinervaColor.cream.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                HStack(spacing: 9) {
                    Image("LogoMark")
                        .resizable()
                        .frame(width: 28, height: 28)
                    (Text("Minerva ").foregroundStyle(MinervaColor.ink)
                        + Text("Flow").foregroundStyle(MinervaColor.emeraldDark))
                        .font(.system(size: 16, weight: .medium))
                }

                card

                Spacer()
                Spacer()
            }
            .padding(.horizontal, 28)
        }
    }

    private var card: some View {
        VStack(spacing: 16) {
            if step == .code {
                codeStep.transition(.opacity.combined(with: .move(edge: .trailing)))
            } else {
                emailStep.transition(.opacity.combined(with: .move(edge: .leading)))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: step)
        .padding(24)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(MinervaColor.border))
        .shadow(color: MinervaColor.ink.opacity(0.05), radius: 16, x: 0, y: 6)
    }

    // MARK: - Step 1: email

    private var emailStep: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Text("Espace client")
                    .font(MinervaFont.display(19))
                    .foregroundStyle(MinervaColor.ink)
                Text("Entrez votre courriel pour recevoir votre code de connexion.")
                    .font(.system(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Courriel")
                    .font(.system(size: 11.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
                TextField("", text: $email, prompt: Text("vous@exemple.com").foregroundStyle(MinervaColor.inkFaint))
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .foregroundStyle(MinervaColor.ink)
                    .tint(MinervaColor.emerald)
                    .padding(12)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                    .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))
            }

            consentSection

            if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 12.5))
                    .foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
            }

            submitButton(title: "Recevoir le code", busyTitle: "Envoi…")
        }
    }

    // MARK: - Step 2: code

    private var codeStep: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Image(systemName: "envelope.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .frame(width: 40, height: 40)
                    .background(MinervaColor.emerald.opacity(0.12))
                    .clipShape(Circle())
                    .padding(.bottom, 4)

                Text("Vérifiez vos courriels")
                    .font(MinervaFont.display(19))
                    .foregroundStyle(MinervaColor.ink)
                Text("Un code de connexion a été envoyé à \(email).")
                    .font(.system(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            TextField("", text: $code, prompt: Text("123456").foregroundStyle(MinervaColor.inkFaint))
                .keyboardType(.numberPad)
                .font(.system(size: 22, weight: .semibold, design: .monospaced))
                .multilineTextAlignment(.center)
                .foregroundStyle(MinervaColor.ink)
                .tint(MinervaColor.emerald)
                .padding(14)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 11))
                .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))

            if let errorMessage {
                Text(errorMessage)
                    .font(.system(size: 12.5))
                    .foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
            }

            submitButton(title: "Confirmer", busyTitle: "Vérification…")

            Button("Changer de courriel") {
                step = .email
                code = ""
                errorMessage = nil
            }
            .font(.system(size: 12.5, weight: .semibold))
            .foregroundStyle(MinervaColor.inkSoft)
        }
    }

    // MARK: - Shared pieces

    private func submitButton(title: String, busyTitle: String) -> some View {
        Button {
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            Task { await primaryAction() }
        } label: {
            HStack {
                if isBusy { ProgressView().tint(.white) }
                Text(isBusy ? busyTitle : title)
                    .font(.system(size: 14.5, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
        }
        .background(MinervaColor.emerald)
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .buttonStyle(PressableButtonStyle())
        .disabled(isBusy || !canSubmit)
        .opacity(canSubmit ? 1 : 0.5)
        .animation(.easeInOut(duration: 0.2), value: step)
    }

    private var canSubmit: Bool {
        if step == .email {
            return !email.isEmpty && acceptedTerms
        }
        return code.count == 6
    }

    /// Real consent capture (required Terms of Use, optional marketing
    /// opt-in) instead of an implicit "you agreed by continuing" — the web
    /// portal doesn't ask this at login since staff enters the customer
    /// first, but a native self-serve signup needs it explicitly.
    private var consentSection: some View {
        VStack(alignment: .leading, spacing: 9) {
            consentRow(checked: $marketingOptIn, text: "J'aimerais recevoir des offres par courriel. Optionnel.")
            consentRow(checked: $acceptedTerms, text: "J'accepte les Conditions d'utilisation et la Politique de confidentialité.")
        }
    }

    private func consentRow(checked: Binding<Bool>, text: String) -> some View {
        Button {
            checked.wrappedValue.toggle()
        } label: {
            HStack(alignment: .top, spacing: 9) {
                Image(systemName: checked.wrappedValue ? "checkmark.square.fill" : "square")
                    .font(.system(size: 16))
                    .foregroundStyle(MinervaColor.emeraldDark)
                Text(text)
                    .font(.system(size: 11.5))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .buttonStyle(.plain)
    }

    private func primaryAction() async {
        errorMessage = nil
        isBusy = true
        defer { isBusy = false }
        do {
            if step == .email {
                try await supabase.sendCode(email: email.trimmingCharacters(in: .whitespaces), marketingOptIn: marketingOptIn)
                step = .code
            } else {
                try await supabase.verifyCode(email: email.trimmingCharacters(in: .whitespaces), code: code)
            }
        } catch {
            errorMessage = step == .email
                ? "Impossible d'envoyer le code. Vérifiez l'adresse et réessayez."
                : "Code invalide ou expiré. Réessayez."
        }
    }
}

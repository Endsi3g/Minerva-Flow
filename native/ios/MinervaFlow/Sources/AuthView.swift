import SwiftUI

struct AuthView: View {
    @EnvironmentObject var supabase: SupabaseManager

    @State private var email = ""
    @State private var code = ""
    @State private var step: Step = .email
    @State private var isBusy = false
    @State private var errorMessage: String?

    enum Step { case email, code }

    var body: some View {
        ZStack {
            MinervaColor.cream.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 24) {
                Spacer()

                Image("LogoMark")
                    .resizable()
                    .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Minerva Flow")
                        .font(MinervaFont.display(28))
                        .foregroundStyle(MinervaColor.ink)
                    Text(step == .email
                         ? "Entrez votre courriel pour accéder à votre espace fidélité."
                         : "Un code à 6 chiffres a été envoyé à \(email).")
                        .font(.system(size: 14))
                        .foregroundStyle(MinervaColor.inkSoft)
                }

                if step == .email {
                    TextField("vous@exemple.com", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .foregroundStyle(MinervaColor.ink)
                        .tint(MinervaColor.emerald)
                        .padding(14)
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(MinervaColor.border))
                } else {
                    TextField("123456", text: $code)
                        .keyboardType(.numberPad)
                        .font(.system(size: 22, weight: .semibold, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(MinervaColor.ink)
                        .tint(MinervaColor.emerald)
                        .padding(14)
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(MinervaColor.border))
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.system(size: 12.5))
                        .foregroundStyle(.red)
                }

                Button {
                    Task { await primaryAction() }
                } label: {
                    HStack {
                        if isBusy { ProgressView().tint(.white) }
                        Text(step == .email ? "Recevoir mon code" : "Confirmer")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                }
                .background(MinervaColor.emerald)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .disabled(isBusy || (step == .email ? email.isEmpty : code.count < 6))

                if step == .code {
                    Button("Changer de courriel") {
                        step = .email
                        code = ""
                        errorMessage = nil
                    }
                    .font(.system(size: 12.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .frame(maxWidth: .infinity)
                }

                Spacer()
                Spacer()
            }
            .padding(28)
        }
    }

    private func primaryAction() async {
        errorMessage = nil
        isBusy = true
        defer { isBusy = false }
        do {
            if step == .email {
                try await supabase.sendCode(email: email.trimmingCharacters(in: .whitespaces))
                step = .code
            } else {
                try await supabase.verifyCode(email: email.trimmingCharacters(in: .whitespaces), code: code)
            }
        } catch {
            errorMessage = step == .email
                ? "Impossible d'envoyer le code — vérifiez l'adresse et réessayez."
                : "Code invalide ou expiré — réessayez."
        }
    }
}

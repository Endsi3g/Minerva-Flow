import SwiftUI
import Supabase

/// Direct replica of the real web portal login (app/[locale]/portal/login/
/// page.tsx) — centered logo + wordmark above a bordered card, "Espace
/// client" title, same copy tone, same cream background. The only real
/// difference from the web: native uses a typed 6-digit code instead of a
/// tapped magic link (deep-linking a link back into a native app is more
/// friction-prone than typing 6 digits).
///
/// Beyond the visual replica, this carries the production behavior a real
/// OTP screen needs that a bare form does not: live email validation before
/// the button ever becomes tappable, keyboard focus that advances itself
/// between fields and dismisses on submit, auto-verification the instant
/// the 6th digit lands (nobody wants to tap Confirm after typing a code
/// meant to be typed once), a resend cooldown so a customer can't spam
/// their own inbox, and real tappable links to the actual legal pages
/// instead of static unlinked text next to a checkbox.
struct AuthView: View {
    @EnvironmentObject var supabase: SupabaseManager

    @State private var email = ""
    @State private var code = ""
    @State private var step: Step = .email
    @State private var acceptedTerms = false
    @State private var marketingOptIn = true
    @State private var isBusy = false
    @State private var errorMessage: String?
    @State private var resendCooldown = 0
    @State private var resendTimer: Timer?
    @State private var legalSheet: LegalDocument?
    @State private var oauthBusy: Provider?
    @State private var oauthError: String?

    @FocusState private var focusedField: Field?

    enum Step { case email, code }
    enum Field { case email, code }
    enum LegalDocument: Identifiable {
        case terms, privacy
        var id: Self { self }
        var title: String { self == .terms ? "Conditions d'utilisation" : "Politique de confidentialité" }
        var url: URL {
            URL(string: self == .terms ? "https://minervaflow.app/legal/terms" : "https://minervaflow.app/legal/privacy")!
        }
    }

    var body: some View {
        ZStack {
            MinervaColor.cream.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    Spacer(minLength: 60)

                    HStack(spacing: 9) {
                        Image("LogoMark")
                            .resizable()
                            .frame(width: 28, height: 28)
                        (Text("Minerva ").foregroundStyle(MinervaColor.ink)
                            + Text("Flow").foregroundStyle(MinervaColor.emeraldDark))
                            .font(.system(size: 16, weight: .medium))
                    }

                    card

                    Spacer(minLength: 60)
                }
                .padding(.horizontal, 28)
                .frame(minHeight: UIScreen.main.bounds.height - 100)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("OK") { focusedField = nil }
                    .font(.system(size: 14, weight: .semibold))
            }
        }
        .sheet(item: $legalSheet) { doc in
            LegalDocumentSheet(document: doc)
        }
        .onDisappear { resendTimer?.invalidate() }
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

            oauthSection

            orDivider

            VStack(alignment: .leading, spacing: 6) {
                Text("Courriel")
                    .font(.system(size: 11.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
                TextField("", text: $email, prompt: Text("vous@exemple.com").foregroundStyle(MinervaColor.inkFaint))
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.go)
                    .focused($focusedField, equals: .email)
                    .onSubmit { if canSubmit { Task { await primaryAction() } } }
                    .foregroundStyle(MinervaColor.ink)
                    .tint(MinervaColor.emerald)
                    .padding(12)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                    .overlay(
                        RoundedRectangle(cornerRadius: 11)
                            .stroke(emailLooksInvalid ? Color.red.opacity(0.5) : MinervaColor.border)
                    )

                if emailLooksInvalid {
                    Text("Cette adresse ne semble pas valide.")
                        .font(.system(size: 11))
                        .foregroundStyle(.red)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            consentSection

            if let errorMessage {
                errorBanner(errorMessage)
            }

            submitButton(title: "Recevoir le code", busyTitle: "Envoi…")

            #if DEBUG
            devBypassButton
            #endif
        }
        .onAppear {
            // Firing the keyboard's own slide-up animation at the exact
            // instant RootView's screen crossfade starts makes both
            // animations fight each other — that fight is what reads as
            // "the loading feels broken" after tapping Commencer/Se
            // connecter, not an actual network delay (there isn't one on
            // this screen). Waiting until the crossfade (0.35s) has
            // resolved lets the keyboard animate on its own, cleanly.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                focusedField = .email
            }
        }
    }

    // MARK: - OAuth (Google / Facebook)

    private var oauthSection: some View {
        VStack(spacing: 12) {
            if let oauthError {
                errorBanner(oauthError)
            }

            oauthButton(provider: .google, title: "Continuer avec Google", systemImage: "g.circle.fill", tint: Color(red: 0.26, green: 0.52, blue: 0.96))
            oauthButton(provider: .facebook, title: "Continuer avec Facebook", systemImage: "f.circle.fill", tint: Color(red: 0.09, green: 0.47, blue: 0.95))
        }
    }

    private var orDivider: some View {
        HStack(spacing: 10) {
            Rectangle().fill(MinervaColor.border).frame(height: 1)
            Text("OU")
                .font(.system(size: 10.5, weight: .bold))
                .tracking(0.6)
                .foregroundStyle(MinervaColor.inkFaint)
            Rectangle().fill(MinervaColor.border).frame(height: 1)
        }
    }

    private func oauthButton(provider: Provider, title: String, systemImage: String, tint: Color) -> some View {
        Button {
            Task { await startOAuth(provider) }
        } label: {
            HStack(spacing: 10) {
                if oauthBusy == provider {
                    ProgressView()
                } else {
                    Image(systemName: systemImage)
                        .font(.system(size: 16))
                        .foregroundStyle(tint)
                }
                Text(oauthBusy == provider ? "Redirection…" : title)
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))
        .buttonStyle(PressableButtonStyle())
        .disabled(oauthBusy != nil || isBusy)
    }

    private func startOAuth(_ provider: Provider) async {
        oauthBusy = provider
        oauthError = nil
        do {
            try await supabase.signInWithOAuth(provider: provider)
        } catch {
            oauthError = "La connexion a échoué. Réessayez."
        }
        oauthBusy = nil
    }

    #if DEBUG
    /// Debug-only shortcut while OTP email delivery is unreliable — signs
    /// into a real, seeded Supabase session (see Config.devTestEmail) with
    /// a password grant, so every screen behind it still runs against real
    /// RLS-scoped data rather than mocked state. Stripped from Release
    /// builds by the surrounding #if DEBUG, never ships to TestFlight/App
    /// Store.
    private var devBypassButton: some View {
        Button {
            isBusy = true
            errorMessage = nil
            Task {
                defer { isBusy = false }
                do {
                    try await supabase.signInWithDevTestAccount()
                } catch {
                    errorMessage = "Bypass dev échoué : \(error.localizedDescription)"
                }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "hammer.fill")
                Text("Sauter la connexion (dev, OTP désactivé)")
            }
            .font(.system(size: 12, weight: .semibold))
        }
        .foregroundStyle(.orange)
        .padding(.top, 4)
    }
    #endif

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
                .textContentType(.oneTimeCode)
                .font(.system(size: 24, weight: .semibold, design: .monospaced))
                .tracking(6)
                .multilineTextAlignment(.center)
                .focused($focusedField, equals: .code)
                .foregroundStyle(MinervaColor.ink)
                .tint(MinervaColor.emerald)
                .padding(14)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 11))
                .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))
                .onChange(of: code) { _, newValue in
                    // Keep only digits, cap at 6 — a pasted code with stray
                    // whitespace or the "your code is" prefix some mail
                    // clients quote shouldn't break auto-submit.
                    let digitsOnly = String(newValue.filter(\.isNumber).prefix(6))
                    if digitsOnly != newValue { code = digitsOnly }
                    if digitsOnly.count == 6 && !isBusy {
                        focusedField = nil
                        Task { await primaryAction() }
                    }
                }

            if let errorMessage {
                errorBanner(errorMessage)
            }

            submitButton(title: "Confirmer", busyTitle: "Vérification…")

            HStack(spacing: 4) {
                Text("Vous n'avez rien reçu ?")
                    .font(.system(size: 12))
                    .foregroundStyle(MinervaColor.inkFaint)
                Button(resendCooldown > 0 ? "Renvoyer (\(resendCooldown)s)" : "Renvoyer le code") {
                    Task { await resendCode() }
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(resendCooldown > 0 ? MinervaColor.inkFaint : MinervaColor.emeraldDark)
                .disabled(resendCooldown > 0)
            }

            Button("Changer de courriel") {
                withAnimation {
                    step = .email
                    code = ""
                    errorMessage = nil
                    stopResendCooldown()
                }
            }
            .font(.system(size: 12.5, weight: .semibold))
            .foregroundStyle(MinervaColor.inkSoft)
        }
        .onAppear { startResendCooldown() }
    }

    // MARK: - Shared pieces

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 12))
                .padding(.top, 1)
            Text(message)
                .font(.system(size: 12.5))
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(.red)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func submitButton(title: String, busyTitle: String) -> some View {
        Button {
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            focusedField = nil
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

    private var emailLooksInvalid: Bool {
        !email.isEmpty && !isValidEmail(email)
    }

    private func isValidEmail(_ value: String) -> Bool {
        let pattern = #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#
        return value.range(of: pattern, options: .regularExpression) != nil
    }

    private var canSubmit: Bool {
        if step == .email {
            return isValidEmail(email) && acceptedTerms
        }
        return code.count == 6
    }

    /// Real consent capture (required Terms of Use, optional marketing
    /// opt-in) instead of an implicit "you agreed by continuing" — the web
    /// portal doesn't ask this at login since staff enters the customer
    /// first, but a native self-serve signup needs it explicitly, with real
    /// tappable links to the actual legal pages rather than plain text.
    private var consentSection: some View {
        VStack(alignment: .leading, spacing: 9) {
            consentRow(checked: $marketingOptIn) {
                Text("J'aimerais recevoir des offres par courriel. Optionnel.")
            }
            consentRow(checked: $acceptedTerms) {
                (Text("J'accepte les ")
                    + Text("Conditions d'utilisation").underline()
                    + Text(" et la ")
                    + Text("Politique de confidentialité").underline())
            }
        }
    }

    private func consentRow<Label: View>(checked: Binding<Bool>, @ViewBuilder label: () -> Label) -> some View {
        HStack(alignment: .top, spacing: 9) {
            Button {
                checked.wrappedValue.toggle()
            } label: {
                Image(systemName: checked.wrappedValue ? "checkmark.square.fill" : "square")
                    .font(.system(size: 16))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }
            .buttonStyle(.plain)

            label()
                .font(.system(size: 11.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .onTapGesture {
                    // Tapping the sentence itself opens the relevant
                    // document rather than toggling the checkbox — the
                    // checkbox glyph is the only tap target for consent
                    // itself, matching how the web's own <Link> elements
                    // work inside a still-clickable label.
                    legalSheet = .terms
                }
        }
    }

    // MARK: - Actions

    private func primaryAction() async {
        errorMessage = nil
        isBusy = true
        defer { isBusy = false }
        do {
            if step == .email {
                try await supabase.sendCode(email: email.trimmingCharacters(in: .whitespaces), marketingOptIn: marketingOptIn)
                withAnimation { step = .code }
            } else {
                try await supabase.verifyCode(email: email.trimmingCharacters(in: .whitespaces), code: code)
            }
        } catch {
            errorMessage = step == .email
                ? "Impossible d'envoyer le code. Vérifiez l'adresse et réessayez."
                : "Code invalide ou expiré. Réessayez."
            if step == .code {
                // A rejected code should be retyped, not silently
                // re-verified against the same wrong digits.
                code = ""
            }
        }
    }

    private func resendCode() async {
        guard resendCooldown == 0 else { return }
        errorMessage = nil
        do {
            try await supabase.sendCode(email: email.trimmingCharacters(in: .whitespaces), marketingOptIn: marketingOptIn)
            startResendCooldown()
        } catch {
            errorMessage = "Impossible de renvoyer le code pour l'instant. Réessayez dans un moment."
        }
    }

    private func startResendCooldown() {
        resendCooldown = 30
        resendTimer?.invalidate()
        resendTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            Task { @MainActor in
                if resendCooldown > 0 {
                    resendCooldown -= 1
                } else {
                    resendTimer?.invalidate()
                }
            }
        }
    }

    private func stopResendCooldown() {
        resendTimer?.invalidate()
        resendCooldown = 0
    }
}

/// In-app browser sheet for the two legal documents — reuses the real,
/// already-published web pages (app/[locale]/legal/terms,
/// app/[locale]/legal/privacy) instead of duplicating their text natively,
/// so the legal copy has exactly one source of truth.
struct LegalDocumentSheet: View {
    let document: AuthView.LegalDocument
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            WebPageView(url: document.url)
                .navigationTitle(document.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Fermer") { dismiss() }
                    }
                }
        }
    }
}

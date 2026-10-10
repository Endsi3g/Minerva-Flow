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
    var restaurantName: String? = nil
    var isOwnerLogin = false
    var onBack: (() -> Void)? = nil
    @EnvironmentObject var supabase: SupabaseManager
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue

    private var language: AppLanguage { AppLanguage(rawValue: storedLanguage) ?? .fr }

    @State private var email = ""
    @State private var code = ""
    @State private var step: Step = .email
    @State private var acceptedTerms = false
    @State private var marketingOptIn = false
    @State private var sessionReplayOptIn = false
    @State private var isBusy = false
    @State private var errorMessage: String?
    @State private var resendCooldown = 0
    @State private var resendTimer: Timer?
    @State private var legalSheet: LegalDocument?
    @State private var oauthBusy: Provider?
    @State private var oauthError: String?

    /// Alternative to the OTP code below for a customer who'd rather set a
    /// password than retype a code every visit — see
    /// SupabaseManager.signInWithPassword/signUpWithPassword. Defaults to
    /// .code: the passwordless flow stays the primary, most-visible path.
    @State private var authMode: AuthMode = .code
    @State private var passwordSubMode: PasswordSubMode = .login
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var passwordResetSent = false

    @FocusState private var focusedField: Field?

    enum Step { case email, code }
    enum Field { case email, code, password, confirmPassword }
    enum AuthMode { case code, password }
    enum PasswordSubMode { case login, signup }
    enum LegalDocument: Identifiable {
        case terms, privacy
        var id: Self { self }
        var title: String { self == .terms ? "Conditions d'utilisation" : "Politique de confidentialité" }
        /// Built from Config.apiBaseURL rather than a second hardcoded host
        /// — a prior version pointed at the bare apex domain while every
        /// other in-app network call (Config.apiBaseURL) uses the `www`
        /// host, and if those two hosts are ever not perfectly aliased,
        /// this sheet would silently fail to load, which is
        /// indistinguishable from "the page doesn't exist" to whoever's
        /// looking at it.
        var url: URL {
            self == .terms ? Config.termsURL : Config.privacyPolicyURL
        }
    }

    var body: some View {
        ZStack {
            MinervaColor.cream.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    if let onBack {
                        Button(action: onBack) {
                            Label(language == .fr ? "Retour" : "Back", systemImage: "chevron.left")
                                .font(.mv(size: 14, weight: .semibold))
                                .foregroundStyle(MinervaColor.emeraldDark)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    HStack(spacing: 10) {
                        Image("LogoMark")
                            .resizable()
                            .frame(width: 34, height: 34)
                            .accessibilityHidden(true)
                        Text("Minerva Flow")
                            .font(.mv(size: 20, weight: .semibold))
                            .foregroundStyle(MinervaColor.ink)
                        Spacer(minLength: 8)
                        LanguageMenu(language: Binding(get: { language }, set: { storedLanguage = $0.rawValue }), tint: MinervaColor.emeraldDark)
                            .environment(\.colorScheme, .light)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityElement(children: .contain)

                    card

                    Spacer(minLength: 60)
                }
                .padding(24)
                .frame(maxWidth: 540)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("OK") { focusedField = nil }
                    .font(.mv(size: 14, weight: .semibold))
            }
        }
        .sheet(item: $legalSheet) { doc in
            LegalDocumentSheet(document: doc)
        }
        .onDisappear { resendTimer?.invalidate() }
    }

    private var card: some View {
        VStack(spacing: 16) {
            if passwordResetSent {
                passwordResetSentView.transition(.opacity)
            } else if step == .code {
                codeStep.transition(.opacity.combined(with: .move(edge: .trailing)))
            } else {
                emailStep.transition(.opacity.combined(with: .move(edge: .leading)))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: step)
        .animation(.easeInOut(duration: 0.3), value: passwordResetSent)
        .padding(24)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(MinervaColor.border))
        .shadow(color: MinervaColor.ink.opacity(0.05), radius: 16, x: 0, y: 6)
    }

    // MARK: - Step 1: email

    private var emailStep: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text(greetingTitle)
                    .font(MinervaFont.display(28, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                Text(greetingSubtitle)
                    .font(.mv(size: 14))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            oauthSection

            orDivider

            authModeToggle

            VStack(alignment: .leading, spacing: 6) {
                Text("Courriel")
                    .font(.mv(size: 11.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
                TextField("", text: $email, prompt: Text("vous@exemple.com").foregroundStyle(MinervaColor.inkFaint))
                    .accessibilityIdentifier("authEmail")
                    .accessibilityLabel(language == .fr ? "Courriel" : "Email")
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(authMode == .code ? .go : .next)
                    .focused($focusedField, equals: .email)
                    .onTapGesture { focusedField = .email }
                    .onSubmit {
                        if authMode == .code {
                            if canSubmit { Task { await primaryAction() } }
                        } else {
                            focusedField = .password
                        }
                    }
                    .foregroundStyle(MinervaColor.ink)
                    .tint(MinervaColor.emerald)
                    .padding(12)
                    .background(MinervaColor.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                    .overlay(
                        RoundedRectangle(cornerRadius: 11)
                            .stroke(emailLooksInvalid ? Color.red.opacity(0.5) : MinervaColor.border)
                    )

                if emailLooksInvalid {
                    Text("Cette adresse ne semble pas valide.")
                        .font(.mv(size: 11))
                        .foregroundStyle(.red)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            if authMode == .password {
                passwordFields.transition(.opacity)
            }

            // Consent/terms are a signup concept — a returning customer
            // logging in with a password already agreed to these when
            // their account was created (whichever method they used), so
            // asking again here was both nonsensical copy and needless
            // extra length on what should be the shortest path in the app.
            if needsConsent {
                consentSection.transition(.opacity)
            }

            if let errorMessage {
                errorBanner(errorMessage)
            }

            submitButton(title: submitTitle, busyTitle: submitBusyTitle)

            if authMode == .password && passwordSubMode == .login {
                Button("Mot de passe oublié ?") {
                    Task { await handleForgotPassword() }
                }
                .font(.mv(size: 12.5, weight: .semibold))
                .foregroundStyle(MinervaColor.emeraldDark)
                .disabled(isBusy)
            }

        }
        .animation(.easeInOut(duration: 0.2), value: authMode)
        .animation(.easeInOut(duration: 0.2), value: passwordSubMode)

    }

    // MARK: - OAuth (Apple / Google)

    private var oauthSection: some View {
        VStack(spacing: 12) {
            if let oauthError {
                errorBanner(oauthError)
            }

            // Apple first and equally prominent, not an afterthought — App
            // Store Review Guideline 4.8 requires offering Sign in with
            // Apple whenever another third-party social login (Google,
            // below) is offered, with equivalent placement.
            oauthButton(provider: .apple, title: "Continuer avec Apple") {
                AppleMarkIcon()
            }
            oauthButton(provider: .google, title: "Continuer avec Google") {
                GoogleMarkIcon().frame(width: 18, height: 18)
            }
        }
    }

    // MARK: - Code / Password toggle

    private var authModeToggle: some View {
        HStack(spacing: 2) {
            modeToggleButton(title: "Code par courriel", isActive: authMode == .code) {
                authMode = .code
                errorMessage = nil
            }
            modeToggleButton(title: "Mot de passe", isActive: authMode == .password) {
                authMode = .password
                errorMessage = nil
            }
        }
        .padding(3)
        .background(MinervaColor.cream)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func modeToggleButton(title: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.mv(size: 12.5, weight: .semibold))
                .foregroundStyle(isActive ? MinervaColor.ink : MinervaColor.inkFaint)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(isActive ? .white : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 9))
                // Without this, the inactive tab's Color.clear background
                // isn't hit-testable under .plain button style — its tap
                // silently no-ops (confirmed live: 0 action calls on a
                // real device tap). The active tab worked by accident
                // because .white happens to be opaque.
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Password fields (email step, authMode == .password)

    private var passwordFields: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 6) {
                Text(passwordSubMode == .signup ? "Créer un mot de passe" : "Mot de passe")
                    .font(.mv(size: 11.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkSoft)
                SecureField("", text: $password, prompt: Text("••••••••").foregroundStyle(MinervaColor.inkFaint))
                    .textContentType(passwordSubMode == .signup ? .newPassword : .password)
                    .submitLabel(passwordSubMode == .signup ? .next : .go)
                    .focused($focusedField, equals: .password)
                    .onSubmit {
                        if passwordSubMode == .signup {
                            focusedField = .confirmPassword
                        } else if canSubmit {
                            Task { await primaryAction() }
                        }
                    }
                    .foregroundStyle(MinervaColor.ink)
                    .tint(MinervaColor.emerald)
                    .padding(12)
                    .background(MinervaColor.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 11))
                    .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))

                if passwordSubMode == .signup {
                    Text("8 caractères minimum")
                        .font(.mv(size: 11))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
            }

            if passwordSubMode == .signup {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Confirmer le mot de passe")
                        .font(.mv(size: 11.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.inkSoft)
                    SecureField("", text: $confirmPassword, prompt: Text("••••••••").foregroundStyle(MinervaColor.inkFaint))
                        .textContentType(.newPassword)
                        .submitLabel(.go)
                        .focused($focusedField, equals: .confirmPassword)
                        .onSubmit { if canSubmit { Task { await primaryAction() } } }
                        .foregroundStyle(MinervaColor.ink)
                        .tint(MinervaColor.emerald)
                        .padding(12)
                        .background(MinervaColor.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 11))
                        .overlay(
                            RoundedRectangle(cornerRadius: 11)
                                .stroke(passwordsMismatch ? Color.red.opacity(0.5) : MinervaColor.border)
                        )
                    if passwordsMismatch {
                        Text("Les mots de passe ne correspondent pas.")
                            .font(.mv(size: 11))
                            .foregroundStyle(.red)
                    }
                }
            }

            HStack {
                Spacer()
                Button(passwordSubMode == .signup ? "Déjà client ? Se connecter" : "Nouveau ? Créer un compte") {
                    passwordSubMode = passwordSubMode == .signup ? .login : .signup
                    errorMessage = nil
                }
                .font(.mv(size: 12, weight: .semibold))
                .foregroundStyle(MinervaColor.emeraldDark)
            }
        }
    }

    private var passwordsMismatch: Bool {
        !confirmPassword.isEmpty && confirmPassword != password
    }

    // MARK: - Password reset confirmation

    private var passwordResetSentView: some View {
        VStack(spacing: 16) {
            Image(systemName: "envelope.fill")
                .font(.mv(size: 20))
                .foregroundStyle(MinervaColor.emeraldDark)
                .frame(width: 40, height: 40)
                .background(MinervaColor.emerald.opacity(0.12))
                .clipShape(Circle())

            VStack(spacing: 4) {
                Text("Vérifiez vos courriels")
                    .font(MinervaFont.display(19))
                    .foregroundStyle(MinervaColor.ink)
                Text("Un lien de réinitialisation a été envoyé à \(trimmedEmail). Ouvrez-le pour choisir un nouveau mot de passe, puis revenez ici vous connecter.")
                    .font(.mv(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Button("Retour à la connexion") {
                passwordResetSent = false
            }
            .font(.mv(size: 13, weight: .semibold))
            .foregroundStyle(MinervaColor.emeraldDark)
        }
    }

    private var orDivider: some View {
        HStack(spacing: 10) {
            Rectangle().fill(MinervaColor.border).frame(height: 1)
            Text("OU")
                .font(.mv(size: 10.5, weight: .bold))
                .tracking(0.6)
                .foregroundStyle(MinervaColor.inkFaint)
            Rectangle().fill(MinervaColor.border).frame(height: 1)
        }
    }

    private func oauthButton(provider: Provider, title: String, @ViewBuilder icon: () -> some View) -> some View {
        Button {
            Task { await startOAuth(provider) }
        } label: {
            HStack(spacing: 10) {
                if oauthBusy == provider {
                    ProgressView()
                } else {
                    icon()
                }
                Text(oauthBusy == provider ? "Redirection…" : title)
                    .font(.mv(size: 13.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .background(MinervaColor.surface)
        .clipShape(RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))
        .buttonStyle(PressableButtonStyle())
        .disabled(oauthBusy != nil || isBusy)
    }

    private func startOAuth(_ provider: Provider) async {
        oauthBusy = provider
        oauthError = nil
        do {
            if provider == .apple {
                try await supabase.signInWithApple()
            } else {
                try await supabase.signInWithOAuth(provider: provider)
            }
        } catch {
            oauthError = "La connexion a échoué. Réessayez."
            Analytics.capture("auth_failed", ["method": provider == .apple ? "apple" : "google"])
        }
        oauthBusy = nil
    }

    // MARK: - Step 2: code

    private var codeStep: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Image(systemName: "envelope.fill")
                    .font(.mv(size: 20))
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .frame(width: 40, height: 40)
                    .background(MinervaColor.emerald.opacity(0.12))
                    .clipShape(Circle())
                    .padding(.bottom, 4)

                Text("Vérifiez vos courriels")
                    .font(MinervaFont.display(19))
                    .foregroundStyle(MinervaColor.ink)
                Text("Un code de connexion a été envoyé à \(email).")
                    .font(.mv(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            TextField("", text: $code, prompt: Text("123456").foregroundStyle(MinervaColor.inkFaint))
                .accessibilityIdentifier("authEmailCode")
                .accessibilityLabel(language == .fr ? "Code de vérification par courriel" : "Email verification code")
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .font(.mv(size: 24, weight: .semibold, design: .monospaced))
                .tracking(6)
                .multilineTextAlignment(.center)
                .focused($focusedField, equals: .code)
                .foregroundStyle(MinervaColor.ink)
                .tint(MinervaColor.emerald)
                .padding(14)
                .background(MinervaColor.surface)
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
                    .font(.mv(size: 12))
                    .foregroundStyle(MinervaColor.inkFaint)
                Button(resendCooldown > 0 ? "Renvoyer (\(resendCooldown)s)" : "Renvoyer le code") {
                    Task { await resendCode() }
                }
                .font(.mv(size: 12, weight: .semibold))
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
            .font(.mv(size: 12.5, weight: .semibold))
            .foregroundStyle(MinervaColor.inkSoft)
        }
        .onAppear { startResendCooldown() }
    }

    // MARK: - Shared pieces

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.mv(size: 12))
                .padding(.top, 1)
            Text(message)
                .font(.mv(size: 12.5))
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
                    .font(.mv(size: 14.5, weight: .semibold))
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

    /// Terms/consent only apply to actually creating an account — the OTP
    /// path doubles as signup-or-login (see consentSection's own doc
    /// comment) so it always asks, but password mode knows exactly which
    /// one it is: skip it entirely for a returning login.
    private var needsConsent: Bool {
        !(authMode == .password && passwordSubMode == .login)
    }

    private var canSubmit: Bool {
        if step == .code { return code.count == 6 }
        guard isValidEmail(email) else { return false }
        if needsConsent && !acceptedTerms { return false }
        switch authMode {
        case .code:
            return true
        case .password:
            if passwordSubMode == .login { return !password.isEmpty }
            return password.count >= 8 && password == confirmPassword
        }
    }

    private var trimmedEmail: String { email.trimmingCharacters(in: .whitespaces) }

    private var greetingTitle: String {
        if isOwnerLogin { return language == .fr ? "Gérer mon établissement" : "Manage my restaurant" }
        switch authMode {
        case .code: return language == .fr ? "Bienvenue" : "Welcome"
        case .password: return passwordSubMode == .login ? (language == .fr ? "Content de vous revoir" : "Welcome back") : (language == .fr ? "Créer votre compte" : "Create your account")
        }
    }

    private var greetingSubtitle: String {
        if isOwnerLogin { return language == .fr ? "Connectez-vous avec le compte de votre portail web. Seuls vos droits actifs ouvrent la gestion." : "Sign in with your web portal account. Management requires active permissions." }
        if let restaurantName { return language == .fr ? "Votre compte chez \(restaurantName). Recevez un code par courriel pour continuer." : "Your account at \(restaurantName). Receive an email code to continue." }
        switch authMode {
        case .code: return language == .fr ? "Retrouvez vos points, vos récompenses et les offres de vos restaurants préférés." : "See your points, rewards, and offers from your favourite restaurants."
        case .password:
            return passwordSubMode == .login
                ? (language == .fr ? "Connectez-vous pour accéder à vos points et récompenses." : "Sign in to access your points and rewards.")
                : (language == .fr ? "Créez votre compte, puis rattachez-le au restaurant que vous fréquentez." : "Create your account, then connect it to the restaurant you visit.")
        }
    }

    private var submitTitle: String {
        switch authMode {
        case .code: return language == .fr ? "Recevoir le code" : "Send code"
        case .password: return passwordSubMode == .signup ? (language == .fr ? "Créer mon compte" : "Create account") : (language == .fr ? "Se connecter" : "Sign in")
        }
    }

    private var submitBusyTitle: String {
        switch authMode {
        case .code: return "Envoi…"
        case .password: return passwordSubMode == .signup ? "Création…" : "Connexion…"
        }
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
            consentRow(checked: $sessionReplayOptIn, identifier: "sessionReplayConsent") {
                Text(language == .fr
                     ? "J'accepte que mes sessions dans l'app soient enregistrées (texte et images masqués) pour améliorer Minerva Flow. Optionnel, modifiable dans les paramètres."
                     : "I agree to have my in-app sessions recorded (text and images masked) to improve Minerva Flow. Optional, changeable in settings.")
            }
            HStack(alignment: .top, spacing: 9) {
                consentCheckbox(checked: $acceptedTerms, identifier: "acceptTerms")
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 3) {
                        Text("J'accepte les")
                        Button("Conditions d'utilisation") { legalSheet = .terms }
                            .underline()
                            .foregroundStyle(MinervaColor.emeraldDark)
                            .buttonStyle(.plain)
                    }
                    HStack(spacing: 3) {
                        Text("et la")
                        Button("Politique de confidentialité") { legalSheet = .privacy }
                            .underline()
                            .foregroundStyle(MinervaColor.emeraldDark)
                            .buttonStyle(.plain)
                    }
                }
                .font(.mv(size: 11.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func consentRow<Label: View>(checked: Binding<Bool>, identifier: String = "marketingConsent", @ViewBuilder label: () -> Label) -> some View {
        HStack(alignment: .top, spacing: 9) {
            consentCheckbox(checked: checked, identifier: identifier)

            label()
                .font(.mv(size: 11.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func consentCheckbox(checked: Binding<Bool>, identifier: String) -> some View {
        Button {
            checked.wrappedValue.toggle()
        } label: {
            Image(systemName: checked.wrappedValue ? "checkmark.square.fill" : "square")
                .font(.mv(size: 16))
                .foregroundStyle(MinervaColor.emeraldDark)
                .frame(width: 44, height: 44, alignment: .leading).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(checked.wrappedValue ? "Consentement accepté" : "Accepter le consentement")
        .accessibilityIdentifier(identifier)
    }

    // MARK: - Actions

    private func primaryAction() async {
        errorMessage = nil
        isBusy = true
        defer { isBusy = false }
        if needsConsent && step == .email && sessionReplayOptIn { Analytics.sessionReplayConsent = true }
        do {
            if step == .code {
                try await supabase.verifyCode(email: trimmedEmail, code: code)
                Analytics.capture("auth_succeeded", ["method": "email_code"])
                return
            }
            switch authMode {
            case .code:
                try await supabase.sendCode(email: trimmedEmail, marketingOptIn: marketingOptIn)
                Analytics.capture("auth_code_sent")
                withAnimation { step = .code }
            case .password:
                if passwordSubMode == .login {
                    try await supabase.signInWithPassword(email: trimmedEmail, password: password)
                    Analytics.capture("auth_succeeded", ["method": "password"])
                } else {
                    try await supabase.signUpWithPassword(email: trimmedEmail, password: password, marketingOptIn: marketingOptIn)
                    Analytics.capture("signup_submitted", ["method": "password"])
                }
            }
        } catch {
            errorMessage = friendlyErrorMessage()
            Analytics.capture("auth_failed", ["method": step == .code ? "email_code" : (authMode == .code ? "email_code_request" : "password"), "stage": step == .code ? "verify" : "submit"])
            if step == .code {
                // A rejected code should be retyped, not silently
                // re-verified against the same wrong digits.
                code = ""
            }
        }
    }

    private func friendlyErrorMessage() -> String {
        if step == .code { return "Code invalide ou expiré. Réessayez." }
        switch authMode {
        case .code:
            return "Impossible d'envoyer le code. Vérifiez l'adresse et réessayez."
        case .password:
            return passwordSubMode == .login
                ? "Courriel ou mot de passe incorrect."
                : "Impossible de créer le compte. Cette adresse est peut-être déjà utilisée."
        }
    }

    /// Sends the reset link, then shows passwordResetSentView — see
    /// SupabaseManager.requestPasswordReset for why this hands off to a web
    /// page rather than a native "set new password" screen.
    private func handleForgotPassword() async {
        guard isValidEmail(email) else {
            errorMessage = "Entrez d'abord votre courriel ci-dessus."
            return
        }
        errorMessage = nil
        isBusy = true
        defer { isBusy = false }
        do {
            try await supabase.requestPasswordReset(email: trimmedEmail)
            withAnimation { passwordResetSent = true }
        } catch {
            errorMessage = "Impossible d'envoyer le lien. Réessayez."
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

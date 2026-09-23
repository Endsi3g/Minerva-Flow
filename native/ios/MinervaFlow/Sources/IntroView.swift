import SwiftUI

/// Ported from the Starbucks reference's "Your Starbucks run, rewarded"
/// intro screen: full-bleed brand-color hero, bold statement headline,
/// coffee-cup graphic replaced with our own logo mark, "Join now" / "Sign
/// in" pill buttons. This is the very first screen a brand-new visitor
/// sees, before the actual login card (AuthView, which matches the real
/// web portal login exactly per its own separate reference) — the two
/// screens serve different jobs: this one sells the idea, that one signs
/// you in.
struct IntroView: View {
    let onContinue: () -> Void
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue

    private var language: AppLanguage {
        get { AppLanguage(rawValue: storedLanguage) ?? .fr }
        set { storedLanguage = newValue.rawValue }
    }

    var body: some View {
        ZStack {
            MinervaColor.emeraldDark.ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    Spacer()
                    LanguageMenu(language: Binding(
                        get: { AppLanguage(rawValue: storedLanguage) ?? .fr },
                        set: { storedLanguage = $0.rawValue }
                    ))
                    Image("LogoMark")
                        .resizable()
                        .frame(width: 64, height: 64)
                        .shadow(color: .black.opacity(0.15), radius: 16, x: 0, y: 8)
                }
                .padding(.top, 18)
                .padding(.horizontal, 24)

                Spacer(minLength: 24)

                Text("MINERVA FLOW")
                    .font(.system(size: 15, weight: .bold))
                    .tracking(3)
                    .foregroundStyle(.white)
                Text("RÉCOMPENSES")
                    .font(.system(size: 15, weight: .bold))
                    .tracking(3)
                    .foregroundStyle(.white)
                    .padding(.bottom, 28)

                // These strings are already selected from the user's saved
                // in-app language. Treat them as verbatim; interpreting the
                // French branch as a LocalizedStringKey lets iOS's bundle
                // locale translate "Commencer" back to English even while
                // the in-app selector says FR.
                Text(verbatim: language == .fr ? "Votre fidélité,\nrécompensée" : "Your loyalty,\nrewarded")
                    .font(MinervaFont.display(34))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.bottom, 12)

                Text(verbatim: language == .fr ? "Cumulez des points à chaque visite et échangez-les contre de vraies récompenses." : "Earn points with every visit and exchange them for real rewards.")
                    .font(.system(size: 14.5))
                    .foregroundStyle(.white.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 20)

                Spacer()

                VStack(spacing: 12) {
                    Button(action: onContinue) {
                        Text(verbatim: language == .fr ? "Commencer" : "Get started")
                            .font(.system(size: 15.5, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                    }
                    .background(.white)
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .clipShape(Capsule())
                    .buttonStyle(PressableButtonStyle())

                    Button(action: onContinue) {
                        Text(verbatim: language == .fr ? "Se connecter" : "Sign in")
                            .font(.system(size: 15.5, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                    }
                    .foregroundStyle(.white)
                    .overlay(Capsule().stroke(.white.opacity(0.6), lineWidth: 1.5))
                    .buttonStyle(PressableButtonStyle())
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 24)
            }
        }
    }
}

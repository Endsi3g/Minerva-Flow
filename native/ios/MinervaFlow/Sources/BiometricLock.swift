import SwiftUI
import LocalAuthentication

/// Opt-in app lock (Face ID / Touch ID / device passcode fallback) — off by
/// default, since a loyalty app has no sensitive payment data sitting
/// behind it the way a banking app would; this exists because a customer
/// asked for it, not because the data warrants it. Persisted via
/// UserDefaults rather than Keychain since the toggle itself isn't a
/// secret — only the OS-level biometric evaluation matters for security.
@MainActor
final class BiometricLock: ObservableObject {
    static let shared = BiometricLock()

    private let enabledKey = "biometricLockEnabled"

    @Published var isLocked = false
    @Published var isEnabled: Bool {
        didSet { UserDefaults.standard.set(isEnabled, forKey: enabledKey) }
    }

    private init() {
        isEnabled = UserDefaults.standard.bool(forKey: enabledKey)
    }

    /// What this device can actually do — drives both the Profile toggle's
    /// label ("Verrouiller avec Face ID" vs "Touch ID") and whether the
    /// toggle appears at all (a simulator or a device with no enrolled
    /// biometrics still allows the passcode fallback, so the toggle stays
    /// visible either way, just with a generic label in that case).
    var biometryLabel: String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        default: return "le code de l'appareil"
        }
    }

    /// Called once when the app becomes active and again after every
    /// background→foreground transition — re-locking on each foreground is
    /// the entire point of this feature (a phone left unlocked on a table
    /// shouldn't leave the loyalty account open indefinitely).
    func lockIfEnabled() {
        guard isEnabled else { return }
        isLocked = true
    }

    /// Falls back to the device passcode automatically if biometrics fail
    /// or aren't enrolled (`deviceOwnerAuthentication`, not the
    /// biometrics-only policy) — a customer who covered their FaceID
    /// camera or has a bandaged fingertip still needs a way in.
    func authenticate() async -> Bool {
        let context = LAContext()
        context.localizedFallbackTitle = "Utiliser le code"
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "Déverrouillez pour accéder à votre compte Minerva Flow."
            )
            if success { isLocked = false }
            return success
        } catch {
            return false
        }
    }
}

/// Full-screen cover shown whenever BiometricLock.isLocked is true —
/// RootView applies this as a .fullScreenCover over MainTabView so the
/// underlying loyalty data never renders behind it, not just visually but
/// in the view hierarchy (SwiftUI still builds hidden views otherwise).
struct BiometricLockView: View {
    @EnvironmentObject var lock: BiometricLock
    @State private var isAuthenticating = false
    @State private var failed = false

    var body: some View {
        VStack(spacing: 22) {
            Spacer()

            Image("LogoMark")
                .resizable()
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 16))

            VStack(spacing: 6) {
                Text("Minerva Flow verrouillé")
                    .font(MinervaFont.display(20))
                    .foregroundStyle(MinervaColor.ink)
                Text("Déverrouillez avec \(lock.biometryLabel) pour continuer.")
                    .font(.system(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 40)
            }

            if failed {
                Text("Authentification échouée. Réessayez.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(.red)
            }

            Spacer()

            Button {
                Task { await attempt() }
            } label: {
                HStack {
                    if isAuthenticating { ProgressView().tint(.white) }
                    Image(systemName: "faceid")
                    Text("Déverrouiller")
                        .font(.system(size: 14.5, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
            }
            .background(MinervaColor.emerald)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .buttonStyle(PressableButtonStyle())
            .disabled(isAuthenticating)
            .padding(.horizontal, 28)
            .padding(.bottom, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MinervaColor.cream.ignoresSafeArea())
        .task { await attempt() }
    }

    private func attempt() async {
        isAuthenticating = true
        failed = false
        let success = await lock.authenticate()
        isAuthenticating = false
        if !success { failed = true }
    }
}

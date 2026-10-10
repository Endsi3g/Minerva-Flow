import Foundation
import PostHog

/// Product analytics (PostHog). Events describe what people do and where they
/// get stuck: no emails, names, phone numbers, order contents or free text are
/// ever sent. Users are identified by their opaque account id. People can turn
/// it off in Settings; the choice is stored on the device and honored at once.
enum Analytics {
    static let enabledKey = "analyticsEnabled"
    private static var started = false

    static var isEnabled: Bool {
        get { UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true }
        set {
            UserDefaults.standard.set(newValue, forKey: enabledKey)
            guard started else { return }
            if newValue { PostHogSDK.shared.optIn() } else { PostHogSDK.shared.optOut() }
        }
    }

    static func start() {
        guard !started else { return }
        #if DEBUG
        // Keep tests and simulator runs out of the production funnel.
        if ProcessInfo.processInfo.arguments.contains("-minervaUITestAuth") || ProcessInfo.processInfo.arguments.contains("-minervaUITestStaging") { return }
        #endif
        let config = PostHogConfig(apiKey: Config.posthogToken, host: Config.posthogHost)
        config.captureScreenViews = false          // screens are reported by name below
        config.captureApplicationLifecycleEvents = true
        config.personProfiles = .identifiedOnly
        // Session replay can capture customer names and phone numbers. It stays
        // off until consent copy and the App Privacy label are updated.
        config.sessionReplay = false
        PostHogSDK.shared.setup(config)
        started = true
        if !isEnabled { PostHogSDK.shared.optOut() }
    }

    static func identify(userID: UUID, role: String) {
        guard started else { return }
        PostHogSDK.shared.identify(userID.uuidString.lowercased(), userProperties: [
            "role": role,
            "platform": "ios",
            "language": UserDefaults.standard.string(forKey: AppLanguagePreference.key) ?? "fr",
        ])
    }

    static func reset() {
        guard started else { return }
        PostHogSDK.shared.reset()
    }

    static func screen(_ name: String) {
        guard started else { return }
        PostHogSDK.shared.screen(name)
    }

    static func capture(_ event: String, _ properties: [String: Any] = [:]) {
        guard started else { return }
        PostHogSDK.shared.capture(event, properties: properties)
    }

    /// Failures keep only the operation name and the error's type, never its text.
    static func captureError(_ operation: String, _ error: Error) {
        guard started else { return }
        PostHogSDK.shared.capture("app_error", properties: [
            "operation": operation,
            "error_type": String(describing: type(of: error)),
        ])
    }
}

import Foundation
import PostHog

/// Product analytics (PostHog). Events describe what people do and where they
/// get stuck: no emails, names, phone numbers, order contents or free text are
/// ever sent. Users are identified by their opaque account id. People can turn
/// it off in Settings; the choice is stored on the device and honored at once.
enum Analytics {
    static let enabledKey = "analyticsEnabled"
    static let replayConsentKey = "sessionReplayConsent"
    private static var started = false

    static var isEnabled: Bool {
        get { UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true }
        set {
            UserDefaults.standard.set(newValue, forKey: enabledKey)
            guard started else { return }
            if newValue { PostHogSDK.shared.optIn() } else { PostHogSDK.shared.optOut() }
        }
    }

    /// Explicit opt-in (off by default). Recording uses PostHog's wireframe
    /// mode with all text and images masked; network telemetry is disabled.
    static var sessionReplayConsent: Bool {
        get { UserDefaults.standard.bool(forKey: replayConsentKey) }
        set {
            UserDefaults.standard.set(newValue, forKey: replayConsentKey)
            guard started else { return }
            if newValue && isEnabled {
                PostHogSDK.shared.startSessionRecording()
                capture("session_replay_consent_granted")
            } else {
                PostHogSDK.shared.stopSessionRecording()
                if !newValue { capture("session_replay_consent_withdrawn") }
            }
        }
    }

    static func start() {
        guard !started else { return }
        #if DEBUG
        // Keep tests and simulator runs out of the production funnel.
        let forceAnalytics = ProcessInfo.processInfo.arguments.contains("-minervaAnalyticsDebug")
        if !forceAnalytics, ProcessInfo.processInfo.arguments.contains("-minervaUITestAuth") || ProcessInfo.processInfo.arguments.contains("-minervaUITestStaging") { return }
        #endif
        let config = PostHogConfig(projectToken: Config.posthogToken, host: Config.posthogHost)
        #if DEBUG
        config.debug = ProcessInfo.processInfo.arguments.contains("-minervaAnalyticsDebug")
        config.flushAt = 1
        #endif
        config.captureScreenViews = false          // screens are reported by name below
        config.captureApplicationLifecycleEvents = true
        config.personProfiles = .identifiedOnly
        // Session replay stays off unless the person opted in (Loi 25). Even
        // then, wireframe mode masks every text and image, and network
        // telemetry (URLs can carry identifiers) is not captured.
        config.sessionReplay = false
        config.sessionReplayConfig.maskAllTextInputs = true
        config.sessionReplayConfig.maskAllImages = true
        config.sessionReplayConfig.screenshotMode = false
        config.sessionReplayConfig.captureNetworkTelemetry = false
        config.sessionReplayConfig.captureLogs = false
        PostHogSDK.shared.setup(config)
        started = true
        if !isEnabled { PostHogSDK.shared.optOut() }
        else if sessionReplayConsent { PostHogSDK.shared.startSessionRecording() }
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
    /// Sent as `$exception` so they appear in PostHog Error Tracking. Crashes stay
    /// with Sentry: two crash handlers on the same process can conflict.
    static func captureError(_ operation: String, _ error: Error) {
        guard started else { return }
        let type = String(describing: Swift.type(of: error))
        PostHogSDK.shared.capture("$exception", properties: [
            "$exception_list": [["type": type, "value": operation, "mechanism": ["handled": true, "type": "generic"]]],
            "operation": operation,
        ])
    }

    // MARK: - Feature flags

    /// Gradual rollouts. Flags are created in PostHog; this only reads them.
    static func isFeatureEnabled(_ key: String) -> Bool {
        guard started else { return false }
        return PostHogSDK.shared.isFeatureEnabled(key)
    }

    static func reloadFeatureFlags() {
        guard started else { return }
        PostHogSDK.shared.reloadFeatureFlags()
    }
}

import Foundation
import os

/// Unified diagnostics. Unlike `print`, these go to the unified logging
/// system: the error text is private (redacted) outside a debugger, because
/// network and auth errors can carry URLs, tokens and customer details, and
/// nothing is written to a release build's console in the clear.
enum AppLog {
    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.minervaflow.loyalty", category: "app")

    static func failure(_ operation: String, _ error: Error) {
        logger.error("\(operation, privacy: .public) failed: \(String(describing: error), privacy: .private)")
    }
}

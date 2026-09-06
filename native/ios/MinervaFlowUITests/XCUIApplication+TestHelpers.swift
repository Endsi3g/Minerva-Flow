import XCTest

/// A signed-in session survives across `app.launch()` calls within the same
/// simulator (real Keychain persistence, exactly like on a physical
/// device) — without this, whichever UI test happens to sign in first
/// leaves every other test that expects a signed-out entry point flaky
/// depending on run order. Tests that need the signed-out state call this
/// first; tests that sign in call it again in tearDown so they don't leak
/// a session into whatever runs next.
extension XCTestCase {
    func ensureSignedOut(_ app: XCUIApplication) {
        let profileTab = app.tabBars.buttons["Profil"]
        guard profileTab.waitForExistence(timeout: 3) else { return }
        profileTab.tap()

        let signOut = app.buttons["Se déconnecter"].firstMatch
        guard signOut.waitForExistence(timeout: 3) else { return }
        signOut.tap()

        // Confirmation dialog reuses the same "Se déconnecter" label for
        // its destructive action.
        let confirm = app.buttons["Se déconnecter"].firstMatch
        if confirm.waitForExistence(timeout: 2) {
            confirm.tap()
        }

        _ = app.buttons["Commencer"].waitForExistence(timeout: 5)
    }
}

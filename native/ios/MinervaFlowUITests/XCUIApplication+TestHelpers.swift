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
        // A version-bump survey can be presented once on an upgraded
        // install before the user can reach the tabs. Dismiss it first so
        // the helper can perform the same sign-out action as the user.
        let dismissSurvey = app.buttons["Annuler"]
        if dismissSurvey.waitForExistence(timeout: 2) {
            dismissSurvey.tap()
        }

        // The customer tab is labelled “Plus” in French and “More” in
        // English; “Profil” was the old label and is kept as a fallback for
        // older localized builds.
        let profileTab = app.tabBars.buttons["Profil"].exists
            ? app.tabBars.buttons["Profil"]
            : app.tabBars.buttons["Plus"].exists
                ? app.tabBars.buttons["Plus"]
                : app.tabBars.buttons["More"]
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

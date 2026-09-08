import XCTest

/// Real device/simulator smoke coverage for the one flow every single
/// user has to pass through: the welcome screen (IntroView) into the
/// actual login card (AuthView). Deliberately kept to what a
/// signed-out install always shows — no network calls, no test account —
/// so this can't flake on backend state the way a logged-in flow would.
final class AuthFlowUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testWelcomeScreenShowsBothEntryButtons() throws {
        let app = XCUIApplication()
        app.launch()
        ensureSignedOut(app)

        XCTAssertTrue(app.buttons["Commencer"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Se connecter"].exists)
    }

    func testTappingSeConnecterReachesLoginCard() throws {
        let app = XCUIApplication()
        app.launch()
        ensureSignedOut(app)

        let seConnecter = app.buttons["Se connecter"]
        XCTAssertTrue(seConnecter.waitForExistence(timeout: 5))
        seConnecter.tap()

        XCTAssertTrue(app.staticTexts["Bienvenue"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields.firstMatch.waitForExistence(timeout: 5))
    }

    func testTappingCommencerAlsoReachesLoginCard() throws {
        // Commencer and Se connecter intentionally lead to the same login
        // card (see IntroView.swift's own comment) — this asserts that
        // stays true rather than one button silently regressing.
        let app = XCUIApplication()
        app.launch()
        ensureSignedOut(app)

        let commencer = app.buttons["Commencer"]
        XCTAssertTrue(commencer.waitForExistence(timeout: 5))
        commencer.tap()

        XCTAssertTrue(app.staticTexts["Bienvenue"].waitForExistence(timeout: 5))
    }

    /// App Store Review Guideline 4.8: an app offering third-party social
    /// login (Google, present) must also offer Sign in with Apple, with
    /// equivalent prominence — this locks that in as a real regression
    /// check, not just a one-time manual verification.
    func testLoginCardOffersAppleAlongsideGoogle() throws {
        let app = XCUIApplication()
        app.launch()
        ensureSignedOut(app)

        app.buttons["Se connecter"].tap()

        XCTAssertTrue(app.buttons["Continuer avec Apple"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Continuer avec Google"].exists)
    }

    /// The password path is opt-in, alongside the default OTP-code flow —
    /// this checks the toggle actually swaps the form instead of the code
    /// field silently staying underneath.
    func testSwitchingToPasswordModeShowsPasswordFieldAndForgotPasswordLink() throws {
        let app = XCUIApplication()
        app.launch()
        ensureSignedOut(app)

        app.buttons["Se connecter"].tap()
        XCTAssertTrue(app.buttons["Mot de passe"].waitForExistence(timeout: 5))
        // The toggle exists as soon as AuthView mounts, but the screen's
        // own crossfade-in and the email field's delayed auto-focus (see
        // emailStep's onAppear) are still animating at that instant —
        // tapping immediately reproducibly drops the touch (confirmed via
        // a debug tap counter: 0 calls without this wait, 1 with it).
        // Real users never hit this — nobody taps within milliseconds of
        // a screen appearing — so this settles the test to that pace
        // rather than changing app behavior for a race no human triggers.
        sleep(1)
        app.buttons["Mot de passe"].tap()

        XCTAssertTrue(app.secureTextFields.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Mot de passe oublié ?"].exists)
        XCTAssertTrue(app.buttons["Nouveau ? Créer un compte"].exists)
    }
}

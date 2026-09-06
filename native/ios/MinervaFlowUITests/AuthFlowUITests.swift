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

        XCTAssertTrue(app.buttons["Commencer"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Se connecter"].exists)
    }

    func testTappingSeConnecterReachesLoginCard() throws {
        let app = XCUIApplication()
        app.launch()

        let seConnecter = app.buttons["Se connecter"]
        XCTAssertTrue(seConnecter.waitForExistence(timeout: 5))
        seConnecter.tap()

        XCTAssertTrue(app.staticTexts["Espace client"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields.firstMatch.waitForExistence(timeout: 5))
    }

    func testTappingCommencerAlsoReachesLoginCard() throws {
        // Commencer and Se connecter intentionally lead to the same login
        // card (see IntroView.swift's own comment) — this asserts that
        // stays true rather than one button silently regressing.
        let app = XCUIApplication()
        app.launch()

        let commencer = app.buttons["Commencer"]
        XCTAssertTrue(commencer.waitForExistence(timeout: 5))
        commencer.tap()

        XCTAssertTrue(app.staticTexts["Espace client"].waitForExistence(timeout: 5))
    }
}

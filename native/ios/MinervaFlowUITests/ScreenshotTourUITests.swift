import XCTest

/// Visual review aid, not a regression test: signs in through the DEBUG dev
/// bypass, visits each customer tab (and the Compte subpages) and writes a PNG
/// per screen to MV_SHOT_DIR (pass it as TEST_RUNNER_MV_SHOT_DIR=… to
/// xcodebuild), so a reviewer can look at what a customer actually sees.
final class ScreenshotTourUITests: XCTestCase {
    private var app: XCUIApplication!
    private let shotDir: String = {
        ProcessInfo.processInfo.environment["MV_SHOT_DIR"] ?? NSTemporaryDirectory()
    }()

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        try FileManager.default.createDirectory(atPath: shotDir, withIntermediateDirectories: true)
    }

    /// A version-bump survey is presented once over the first screen after an
    /// upgrade; dismiss it so the screenshot shows the screen underneath.
    private func dismissSurveyIfPresent() {
        let title = app.staticTexts["Comment trouvez-vous l'application ?"]
        if title.waitForExistence(timeout: 1.5) {
            let cancel = app.buttons["Annuler"]
            if cancel.exists { cancel.tap() }
            Thread.sleep(forTimeInterval: 1)
        }
    }

    private func shot(_ name: String) {
        Thread.sleep(forTimeInterval: 2.5)
        dismissSurveyIfPresent()
        let png = app.screenshot().pngRepresentation
        try? png.write(to: URL(fileURLWithPath: "\(shotDir)/\(name).png"))
    }

    private func signIn() {
        let tabBar = app.tabBars.firstMatch
        let devBypass = app.buttons["Sauter la connexion (dev, OTP désactivé)"]
        for _ in 0..<14 {
            if tabBar.exists { return }
            // The workspace bootstrap has a watchdog; on a slow network it shows a retry state.
            if app.buttons["Réessayer"].exists { app.buttons["Réessayer"].tap(); _ = tabBar.waitForExistence(timeout: 25); continue }
            if app.buttons["Fermer l'introduction"].exists { app.buttons["Fermer l'introduction"].tap() }
            else if devBypass.waitForExistence(timeout: 1), devBypass.isHittable { devBypass.tap() }
            else if app.buttons["Se connecter"].exists { app.buttons["Se connecter"].tap() }
            else { _ = tabBar.waitForExistence(timeout: 2) }
        }
    }

    private func openTab(_ title: String) {
        let button = app.tabBars.buttons[title]
        if button.waitForExistence(timeout: 8) { button.tap() }
    }

    func testCaptureCustomerTabs() throws {
        app.launch()
        signIn()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 20), "never reached the tab bar")
        _ = app.staticTexts["Historique récent"].waitForExistence(timeout: 15)
        for (index, title) in ["Accueil", "Commander", "Scanner", "Offres", "Compte"].enumerated() {
            openTab(title)
            shot("\(index + 1)-\(title.replacingOccurrences(of: " ", with: "-"))")
        }
        // Compte, scrolled to its lower half.
        app.swipeUp()
        shot("7-Compte-bas")
    }

    /// Taps a pushed row by its visible title (scrolling once if needed) and captures it.
    private func openRow(_ title: String, shotName: String) -> Bool {
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", title)).firstMatch
        if !row.waitForExistence(timeout: 3) {
            app.swipeUp()
            _ = row.waitForExistence(timeout: 2)
        }
        guard row.exists else { return false }
        row.tap()
        shot(shotName)
        return true
    }

    private func goBack() {
        let back = app.navigationBars.buttons.firstMatch
        if back.exists { back.tap() }
        Thread.sleep(forTimeInterval: 0.8)
    }

    func testCaptureCompteSubpages() throws {
        app.launch()
        signIn()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 20))
        _ = app.staticTexts["Historique récent"].waitForExistence(timeout: 15)
        for (title, name) in [("Mes cartes fidélité", "cartes"), ("Aide", "aide"), ("À propos", "apropos"), ("Sécurité", "securite"),
                              ("Confidentialité", "confidentialite"), ("Notifications", "notifications"), ("Apparence", "apparence")] {
            openTab("Compte")
            if openRow(title, shotName: "sub-\(name)") { goBack() }
        }
        openTab("Compte")
        if openRow("Autre", shotName: "sub-autre") {
            for (title, name) in [("Mes favoris", "favoris"), ("Mes commandes", "commandes"), ("Historique de points", "points"),
                                  ("Ambassadeur", "ambassadeur"), ("Nouveautés", "nouveautes")] {
                if openRow(title, shotName: "sub-autre-\(name)") { goBack() }
            }
        }
    }
}

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
        // MV_LANG=en (via TEST_RUNNER_MV_LANG) reviews the English interface.
        if let language = ProcessInfo.processInfo.environment["MV_LANG"] {
            app.launchArguments += ["-appLanguage", language]
        }
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

    /// Tabs are addressed by position so the tour works in French and English.
    private func openTab(_ title: String) {
        let positions = ["Accueil": 0, "Commander": 1, "Scanner": 2, "Offres": 3, "Compte": 4]
        let button = app.tabBars.buttons.element(boundBy: positions[title] ?? 0)
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

    /// The keychain outlives an uninstall, so a previous (team or customer) session can still be
    /// open. Walk the team intro if it shows, then sign out through whichever layout is present.
    private func leavePersistedSession() {
        let teamNext = app.buttons["Suivant"]
        if teamNext.waitForExistence(timeout: 6) {
            for _ in 0..<3 { if teamNext.exists { teamNext.tap(); Thread.sleep(forTimeInterval: 0.6) } }
            if app.buttons["Entrer dans l’espace"].waitForExistence(timeout: 3) { app.buttons["Entrer dans l’espace"].tap() }
        }
        guard app.tabBars.firstMatch.waitForExistence(timeout: 12) else { return }
        let more = app.buttons["Plus"]
        if more.exists && !app.tabBars.buttons["Scanner"].exists {
            more.tap()
            let out = app.buttons["Se déconnecter"]
            if out.waitForExistence(timeout: 3) { out.tap() }
            Thread.sleep(forTimeInterval: 2)
        } else if app.tabBars.buttons["Gestion"].exists {
            // Owner layout: Gestion > Paramètres > Se déconnecter.
            app.tabBars.buttons["Gestion"].tap()
            let settings = app.buttons["Paramètres"]
            if settings.waitForExistence(timeout: 5) { settings.tap() }
            let out = app.buttons["Se déconnecter"]
            if out.waitForExistence(timeout: 5) {
                out.tap()
                let confirm = app.sheets.buttons["Se déconnecter"].exists ? app.sheets.buttons["Se déconnecter"] : app.buttons.matching(NSPredicate(format: "label == 'Se déconnecter'")).element(boundBy: 1)
                if confirm.waitForExistence(timeout: 3) { confirm.tap() }
            }
            Thread.sleep(forTimeInterval: 2)
        } else {
            ensureSignedOut(app)
        }
    }

    /// Owner side. Credentials come from TEST_RUNNER_MV_OWNER_EMAIL and
    /// TEST_RUNNER_MV_OWNER_PASSWORD, never from the repository.
    func testCaptureOwnerTabs() throws {
        let env = ProcessInfo.processInfo.environment
        guard let email = env["MV_OWNER_EMAIL"], let password = env["MV_OWNER_PASSWORD"] else {
            throw XCTSkip("MV_OWNER_EMAIL / MV_OWNER_PASSWORD not set")
        }
        app.launch()

        // Start from a signed-out app: sign out if a previous session is still there.
        leavePersistedSession()
        for _ in 0..<14 {
            if app.textFields.firstMatch.exists { break }
            if app.buttons["Fermer l'introduction"].exists { app.buttons["Fermer l'introduction"].tap() }
            else if app.buttons["Se connecter"].exists { app.buttons["Se connecter"].tap() }
            else { _ = app.textFields.firstMatch.waitForExistence(timeout: 2) }
            Thread.sleep(forTimeInterval: 1)
        }
        let passwordMode = app.buttons["Mot de passe"]
        if passwordMode.waitForExistence(timeout: 5) { passwordMode.tap() }

        let emailField = app.textFields.firstMatch
        XCTAssertTrue(emailField.waitForExistence(timeout: 10), "no email field")
        emailField.tap(); emailField.typeText(email + "\n")
        let passwordField = app.secureTextFields.firstMatch
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5), "no password field")
        Thread.sleep(forTimeInterval: 1)
        passwordField.typeText(password + "\n")
        shot("owner-0-auth-filled")
        let submit = app.buttons.matching(NSPredicate(format: "label == %@", "Se connecter"))
        if submit.count > 0 { submit.element(boundBy: submit.count - 1).tap() }

        // Owner space: wait for a tab bar or sidebar, then visit every tab by position.
        let bar = app.tabBars.firstMatch
        XCTAssertTrue(bar.waitForExistence(timeout: 40), "owner space never appeared")
        Thread.sleep(forTimeInterval: 4)
        dismissSurveyIfPresent()
        let count = bar.buttons.count
        for index in 0..<count {
            let button = bar.buttons.element(boundBy: index)
            if button.exists { button.tap() }
            shot("owner-\(index + 1)")
        }
        leavePersistedSession()
    }

    /// The first-run explainer must move forward with its visible buttons.
    /// Needs a fresh install (xcrun simctl uninstall) so the intro is shown.
    func testOnboardingNextButtonsAdvance() throws {
        app.launch()
        // The keychain outlives an uninstall: leave a persisted team session first.
        let teamNext = app.buttons["Suivant"]
        if teamNext.waitForExistence(timeout: 15) {
            for _ in 0..<3 { if teamNext.exists { teamNext.tap(); Thread.sleep(forTimeInterval: 0.6) } }
            XCTAssertTrue(app.buttons["Entrer dans l’espace"].waitForExistence(timeout: 3), "team intro: last step never reached")
            app.buttons["Entrer dans l’espace"].tap()
        }
        let more = app.buttons["Plus"]
        if more.waitForExistence(timeout: 8) && !app.tabBars.buttons["Scanner"].exists {
            more.tap()
            let out = app.buttons["Se déconnecter"]
            if out.waitForExistence(timeout: 3) { out.tap() }
            Thread.sleep(forTimeInterval: 2)
        }
        let devBypass = app.buttons["Sauter la connexion (dev, OTP désactivé)"]
        for _ in 0..<10 where !app.buttons["Voir mon statut"].exists {
            if devBypass.waitForExistence(timeout: 1), devBypass.isHittable { devBypass.tap() }
            else if app.buttons["Se connecter"].exists { app.buttons["Se connecter"].tap() }
            Thread.sleep(forTimeInterval: 1.5)
        }
        let first = app.buttons["Voir mon statut"]
        if !first.waitForExistence(timeout: 20) { shot("onboarding-diag") }
        try XCTSkipUnless(first.exists, "intro not shown (not a fresh install)")
        XCTAssertTrue(app.staticTexts["Étape 1 sur 5"].exists || app.otherElements["Étape 1 sur 5"].exists)
        first.tap()
        XCTAssertTrue(app.buttons["Voir mes avantages"].waitForExistence(timeout: 5), "step 2 never appeared")
        shot("onboarding-2")
        app.buttons["Voir mes avantages"].tap()
        XCTAssertTrue(app.buttons["Continuer"].waitForExistence(timeout: 5), "step 3 never appeared")
        app.buttons["Continuer"].tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label == 'Plus tard'")).firstMatch.waitForExistence(timeout: 5), "step 4 never appeared")
        shot("onboarding-4")
        app.buttons["Retour"].tap()
        XCTAssertTrue(app.buttons["Continuer"].waitForExistence(timeout: 5), "back never returned to step 3")
    }

    /// Owner side: open a customer from the Loyalty tab, write a staff-only note, reopen it.
    /// Credentials come from MV_OWNER_EMAIL / MV_OWNER_PASSWORD (TEST_RUNNER_ prefix).
    func testOwnerStaffNoteRoundTrip() throws {
        let env = ProcessInfo.processInfo.environment
        guard let email = env["MV_OWNER_EMAIL"], let password = env["MV_OWNER_PASSWORD"] else {
            throw XCTSkip("MV_OWNER_EMAIL / MV_OWNER_PASSWORD not set")
        }
        app.launch()
        leavePersistedSession()
        for _ in 0..<14 {
            if app.textFields.firstMatch.exists { break }
            if app.buttons["Fermer l'introduction"].exists { app.buttons["Fermer l'introduction"].tap() }
            else if app.buttons["Se connecter"].exists { app.buttons["Se connecter"].tap() }
            else { _ = app.textFields.firstMatch.waitForExistence(timeout: 2) }
            Thread.sleep(forTimeInterval: 1)
        }
        if app.buttons["Mot de passe"].waitForExistence(timeout: 5) { app.buttons["Mot de passe"].tap() }
        let emailField = app.textFields.firstMatch
        XCTAssertTrue(emailField.waitForExistence(timeout: 10), "no email field")
        emailField.tap(); emailField.typeText(email + "\n")
        let passwordField = app.secureTextFields.firstMatch
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5), "no password field")
        Thread.sleep(forTimeInterval: 1)
        passwordField.typeText(password + "\n")

        let bar = app.tabBars.firstMatch
        XCTAssertTrue(bar.waitForExistence(timeout: 40), "owner space never appeared")
        Thread.sleep(forTimeInterval: 3)
        dismissSurveyIfPresent()
        let loyalty = bar.buttons["Fidélité"]
        if !loyalty.waitForExistence(timeout: 5) { shot("owner-staff-note-layout") }
        try XCTSkipUnless(loyalty.exists, "not the owner layout")
        loyalty.tap()
        let row = app.buttons.matching(NSPredicate(format: "label CONTAINS 'points ·'")).firstMatch
        if !row.waitForExistence(timeout: 6) { app.swipeUp(); _ = row.waitForExistence(timeout: 4) }
        try XCTSkipUnless(row.exists, "this restaurant has no customers")
        row.tap()
        XCTAssertTrue(app.staticTexts["Notes de l'équipe"].waitForExistence(timeout: 8), "note sheet never opened")
        let field = app.textFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        field.tap(); field.typeText("Allergie aux noix, table 4")
        shot("owner-staff-note-filled")
        app.buttons["Enregistrer"].tap()
        XCTAssertFalse(app.staticTexts["Notes de l'équipe"].waitForExistence(timeout: 3), "sheet should close after saving")
        // Reopen: the note is read back from the database.
        row.tap()
        XCTAssertTrue(app.staticTexts["Notes de l'équipe"].waitForExistence(timeout: 8))
        let reopened = app.textFields.firstMatch
        XCTAssertTrue(reopened.waitForExistence(timeout: 5))
        let readBack = NSPredicate(format: "value CONTAINS 'Allergie aux noix'")
        expectation(for: readBack, evaluatedWith: reopened)
        waitForExpectations(timeout: 8)
        shot("owner-staff-note-reopened")
        // Clean up: clear the note so the test leaves no data behind.
        reopened.tap()
        if let value = reopened.value as? String {
            reopened.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: value.count))
        }
        app.buttons["Enregistrer"].tap()
        leavePersistedSession()
    }
}


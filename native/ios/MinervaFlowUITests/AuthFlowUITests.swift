import XCTest

/// Real device/simulator smoke coverage for the one flow every single
/// user has to pass through: the welcome screen (IntroView) into the
/// actual login card (AuthView). Deliberately kept to what a
/// signed-out install always shows — no network calls, no test account —
/// so this can't flake on backend state the way a logged-in flow would.
final class AuthFlowUITests: XCTestCase {
    override func tearDownWithError() throws {
        if let run = testRun, run.failureCount > 0 {
            let app = XCUIApplication()
            let shot = XCTAttachment(screenshot: app.screenshot())
            shot.name = "failure-" + name; shot.lifetime = .keepAlways; add(shot)
            if let dir = ProcessInfo.processInfo.environment["MV_SHOT_DIR"] {
                let safe = name.replacingOccurrences(of: "/", with: "-").replacingOccurrences(of: " ", with: "-")
                try? app.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("failure-" + safe + ".png"))
                try? app.debugDescription.write(to: URL(fileURLWithPath: dir).appendingPathComponent("failure-" + safe + ".txt"), atomically: true, encoding: .utf8)
            }
        }
    }

    private func launchSignedOut() throws -> XCUIApplication {
        let app = XCUIApplication()
        let env = ProcessInfo.processInfo.environment
        app.launchArguments = ["-minervaUITestStaging", "-minervaUITestSignedOut"]
        for name in ["MV_TEST_SUPABASE_URL", "MV_TEST_SUPABASE_ANON_KEY", "MV_TEST_API_URL"] {
            app.launchEnvironment[name] = try XCTUnwrap(env[name], "Missing staging environment")
        }
        app.launchEnvironment["MV_TEST_LANGUAGE"] = "fr"
        app.launch()
        XCTAssertTrue(app.textFields["enrollmentSearch"].waitForExistence(timeout: 15))
        // Existence precedes the resolver's crossfade finishing. Wait for
        // stable interactive geometry so the outgoing view cannot absorb a tap.
        let entry = app.buttons["J’ai déjà un compte"]
        var previousFrame: CGRect?
        let settled = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            guard entry.exists, entry.isHittable, entry.isEnabled else { return false }
            let frame = entry.frame
            defer { previousFrame = frame }
            return previousFrame == frame
        }, object: entry)
        XCTAssertEqual(XCTWaiter.wait(for: [settled], timeout: 10), .completed)
        return app
    }
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testWelcomeScreenShowsBothEntryButtons() throws {
        let app = try launchSignedOut()

        XCTAssertTrue(app.buttons["enrollmentScanner"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["J’ai déjà un compte"].exists)
    }

    func testLanguagePickerSwitchesAndRestoresWelcomeLanguage() throws {
        let app = try launchSignedOut()

        let frenchPicker = app.buttons["Langue: français"]
        let englishPicker = app.buttons["Language: English"]
        let startsInFrench = frenchPicker.waitForExistence(timeout: 5)
        let initialPicker = startsInFrench ? frenchPicker : englishPicker
        XCTAssertTrue(initialPicker.waitForExistence(timeout: 5))
        initialPicker.press(forDuration: 0.1)

        try chooseLanguage(startsInFrench ? "English" : "Français", in: app)

        let changedHeadline = startsInFrench ? "Your next visit starts here." : "Votre prochain rendez-vous commence ici."
        XCTAssertTrue(app.staticTexts[changedHeadline].waitForExistence(timeout: 5))

        let changedPicker = startsInFrench ? englishPicker : frenchPicker
        let pickerReady = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "exists == true AND hittable == true"),
            object: changedPicker
        )
        XCTAssertEqual(XCTWaiter.wait(for: [pickerReady], timeout: 5), .completed)
        changedPicker.press(forDuration: 0.1)
        try chooseLanguage(startsInFrench ? "Français" : "English", in: app)

        let initialHeadline = startsInFrench ? "Votre prochain rendez-vous commence ici." : "Your next visit starts here."
        XCTAssertTrue(app.staticTexts[initialHeadline].waitForExistence(timeout: 5))
        XCTAssertTrue((startsInFrench ? frenchPicker : englishPicker).exists)
    }

    private func chooseLanguage(_ label: String, in app: XCUIApplication) throws {
        // iOS renders confirmation options as buttons or menu items. Resolve
        // their kind after presentation, rather than before the animation.
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            app.buttons[label].exists || app.menuItems[label].exists
        }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 8), .completed)
        let choice = app.buttons[label].exists ? app.buttons[label] : app.menuItems[label]
        XCTAssertTrue(choice.isHittable)
        choice.press(forDuration: 0.1)
    }

    func testTappingSeConnecterReachesLoginCard() throws {
        let app = try launchSignedOut()

        let seConnecter = app.buttons["J’ai déjà un compte"]
        XCTAssertTrue(seConnecter.waitForExistence(timeout: 5))
        if !seConnecter.isHittable { app.swipeUp() }
        seConnecter.press(forDuration: 0.1)

        XCTAssertTrue(app.staticTexts["Bienvenue"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields.firstMatch.waitForExistence(timeout: 5))
    }

    func testManagementEntryIsExplicitAndCustomerCanGoBack() throws {
        let app = try launchSignedOut()
        let manage = app.buttons["enrollmentManageRestaurant"]
        if !manage.isHittable { app.swipeUp() }
        XCTAssertTrue(manage.waitForExistence(timeout: 5))
        manage.press(forDuration: 0.1)
        XCTAssertTrue(app.staticTexts["Gérer mon établissement"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.tabBars.buttons["Gestion"].exists)
        app.buttons["Retour"].press(forDuration: 0.1)
        XCTAssertTrue(app.textFields["enrollmentSearch"].waitForExistence(timeout: 5))
    }

    /// App Store Review Guideline 4.8: an app offering third-party social
    /// login (Google, present) must also offer Sign in with Apple, with
    /// equivalent prominence — this locks that in as a real regression
    /// check, not just a one-time manual verification.
    func testLoginCardOffersAppleAlongsideGoogle() throws {
        let app = try launchSignedOut()

        if !app.buttons["J’ai déjà un compte"].isHittable { app.swipeUp() }
        app.buttons["J’ai déjà un compte"].press(forDuration: 0.1)

        XCTAssertTrue(app.buttons["Continuer avec Apple"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Continuer avec Google"].exists)
    }

    /// The password path is opt-in, alongside the default OTP-code flow —
    /// this checks the toggle actually swaps the form instead of the code
    /// field silently staying underneath.
    func testSwitchingToPasswordModeShowsPasswordFieldAndForgotPasswordLink() throws {
        let app = try launchSignedOut()

        if !app.buttons["J’ai déjà un compte"].isHittable { app.swipeUp() }
        app.buttons["J’ai déjà un compte"].press(forDuration: 0.1)
        XCTAssertTrue(app.buttons["Mot de passe"].waitForExistence(timeout: 5))
        // Keep a single, short physical press through the simulator input queue.
        // Assertions still require the actual password form to appear.
        app.buttons["Mot de passe"].press(forDuration: 0.1)

        XCTAssertTrue(app.secureTextFields.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Mot de passe oublié ?"].exists)
        XCTAssertTrue(app.buttons["Nouveau ? Créer un compte"].exists)
    }
}

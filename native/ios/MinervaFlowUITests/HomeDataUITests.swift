import XCTest

/// Regression coverage for a real, reported bug: the dev-test account has
/// real rewards/offers/transactions in the database, but Home has been
/// reported as looking empty on a physical device. This drives the actual
/// DEBUG dev-bypass sign-in (real RLS-scoped Supabase session, not a mock)
/// and asserts the data-dependent UI actually renders — if this ever
/// regresses again (a decode mismatch, a broken query), this test catches
/// it instead of only a person noticing an empty screen.
final class HomeDataUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    override func tearDownWithError() throws {
        // Signs back out so this test's session doesn't leak into whatever
        // UI test runs next and expects a signed-out entry point.
        ensureSignedOut(app)
    }

    func testDevAccountHomeShowsRealRewardData() throws {
        app.launch()

        let nextReward = app.staticTexts["Prochaine récompense"]
        let noReward = app.staticTexts["Aucune récompense pour l'instant"]

        // RootView.swift's real flow is Intro -> Auth -> (post-login)
        // tier-onboarding explainer -> Home. Which of these a launch lands
        // on depends on whether a Supabase session already survived (iOS
        // Keychain persists across app deletion, UserDefaults does not) and
        // whether the one-time tier explainer has already been dismissed —
        // so converge on Home by handling whichever state actually shows,
        // rather than assuming one fixed cold-start path.
        for _ in 0..<4 {
            if nextReward.waitForExistence(timeout: 3) || noReward.exists { break }

            let closeTierOnboarding = app.buttons["Fermer l'introduction"]
            let seConnecter = app.buttons["Se connecter"]
            let devBypass = app.buttons["Sauter la connexion (dev, OTP désactivé)"]

            if closeTierOnboarding.exists {
                closeTierOnboarding.tap()
            } else if seConnecter.waitForExistence(timeout: 2) {
                seConnecter.tap()
            } else if devBypass.waitForExistence(timeout: 2) {
                devBypass.tap()
            }
        }

        // Real network round-trip (Supabase auth + loadPortalData) needs
        // more time than the short per-state checks above.
        let appeared = nextReward.waitForExistence(timeout: 15) || noReward.waitForExistence(timeout: 1)
        XCTAssertTrue(appeared, "Home never finished loading the rewards card")
        XCTAssertTrue(nextReward.exists, "Expected 'Prochaine récompense' (the dev-test account has 3 real rewards seeded) but got the empty state instead")
    }

    func testAddingMenuItemOpensCheckoutWithoutBackingOutTwice() throws {
        app.launch()

        openTestAccount()
        let commander = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "Commander")).firstMatch
        XCTAssertTrue(commander.waitForExistence(timeout: 15), "The authenticated Commander tab did not appear")
        commander.tap()

        let firstCategory = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "article")
        ).firstMatch
        XCTAssertTrue(firstCategory.waitForExistence(timeout: 15), "No menu category loaded")
        firstCategory.tap()

        let addToCart = app.buttons["Ajouter au panier"].firstMatch
        XCTAssertTrue(addToCart.waitForExistence(timeout: 15), "No add-to-cart action appeared")
        addToCart.tap()

        XCTAssertTrue(
            app.staticTexts["Votre commande"].waitForExistence(timeout: 10),
            "Adding an item should open the checkout sheet immediately, without requiring back navigation"
        )
    }

    func testScannerShowsAccountCodeAndRestaurantScannerAction() throws {
        app.launch()
        openTestAccount()
        let scannerTab = app.buttons.matching(NSPredicate(format: "label == %@", "Scanner")).firstMatch
        XCTAssertTrue(scannerTab.waitForExistence(timeout: 15), "The authenticated Scanner tab did not appear")
        scannerTab.tap()

        XCTAssertTrue(app.staticTexts["Présentez votre code"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Scanner le code d’un restaurant"].exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Valide encore")).firstMatch.waitForExistence(timeout: 15))

        let scannerCapture = XCTAttachment(screenshot: app.screenshot())
        scannerCapture.name = "Scanner client — iPhone 17 Pro"
        scannerCapture.lifetime = .keepAlways
        add(scannerCapture)
    }

    /// The auth screen exposes both a "Se connecter" mode selector and a
    /// dedicated dev-only bypass. Prefer the bypass when it exists, otherwise
    /// the tests can repeatedly tap the selector without ever authenticating.
    private func openTestAccount() {
        let commander = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "Commander")).firstMatch
        let scanner = app.buttons.matching(NSPredicate(format: "label == %@", "Scanner")).firstMatch
        let devBypass = app.buttons["Sauter la connexion (dev, OTP désactivé)"]

        for _ in 0..<8 {
            if commander.exists || scanner.exists { return }
            if devBypass.waitForExistence(timeout: 1), devBypass.isHittable {
                devBypass.tap()
            } else if app.buttons["Fermer l'introduction"].exists {
                app.buttons["Fermer l'introduction"].tap()
            } else if app.buttons["Se connecter"].exists {
                app.buttons["Se connecter"].tap()
            } else {
                _ = commander.waitForExistence(timeout: 2)
            }
        }
    }
}

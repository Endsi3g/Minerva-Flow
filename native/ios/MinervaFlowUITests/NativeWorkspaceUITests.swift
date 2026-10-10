import XCTest

final class NativeWorkspaceUITests: XCTestCase {
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

    private func launch(_ role: String, authenticated: Bool = true) throws -> XCUIApplication {
        let env = ProcessInfo.processInfo.environment
        let app = XCUIApplication()
        app.launchArguments = ["-minervaUITestStaging"]
        if authenticated { app.launchArguments.append("-minervaUITestAuth") }
        for name in ["MV_TEST_SUPABASE_URL", "MV_TEST_SUPABASE_ANON_KEY", "MV_TEST_API_URL"] {
            app.launchEnvironment[name] = try XCTUnwrap(env[name], "Missing staging environment")
        }
        app.launchEnvironment["MV_TEST_EMAIL"] = try XCTUnwrap(env["MV_\(role.uppercased())_EMAIL"])
        app.launchEnvironment["MV_TEST_PASSWORD"] = try XCTUnwrap(env["MV_\(role.uppercased())_PASSWORD"])
        app.launchEnvironment["MV_TEST_LANGUAGE"] = "fr"
        app.launch()
        return app
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
        if let directory = ProcessInfo.processInfo.environment["MV_SHOT_DIR"] {
            try? app.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: directory).appendingPathComponent(name + ".png"))
        }
    }
    func testCustomerHasOnlyCustomerWorkspace() throws {
        let app = try launch("customer")
        let close = app.buttons["Fermer l'introduction"]
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            close.exists || app.tabBars.buttons["Compte"].exists
        }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 30), .completed)
        if close.exists { close.press(forDuration: 0.1) }
        XCTAssertTrue(app.tabBars.buttons["Compte"].waitForExistence(timeout: 30))
        XCTAssertFalse(app.tabBars.buttons["Gestion"].exists)
        capture(app, "client-accueil")
        let accountTab = app.tabBars.buttons["Compte"]
        XCTAssertTrue(accountTab.isHittable)
        accountTab.press(forDuration: 0.1)
        if let directory = ProcessInfo.processInfo.environment["MV_SHOT_DIR"] {
            try? app.debugDescription.write(to: URL(fileURLWithPath: directory).appendingPathComponent("client-after-account-tab.txt"), atomically: true, encoding: .utf8)
        }
        XCTAssertTrue(app.staticTexts["Votre compte, vos cartes et vos préférences"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["accountManageRestaurant"].exists)
        capture(app, "client-compte")
    }
    func testOwnerChoosesManagementAndShortcutsReachRealPages() throws {
        let app = try launch("owner")
        XCTAssertTrue(app.buttons["Changer de compte"].waitForExistence(timeout: 30), "Wait for the real owner session before opening management")
        let manage = app.buttons["enrollmentManageRestaurant"]
        XCTAssertTrue(manage.waitForExistence(timeout: 30))
        XCTAssertFalse(app.tabBars.buttons["Gestion"].exists, "A login must not force owner mode")
        if !manage.isHittable { app.swipeUp() }
        manage.press(forDuration: 0.1)
        XCTAssertTrue(app.tabBars.buttons["Gestion"].waitForExistence(timeout: 35))
        XCTAssertTrue(app.staticTexts["Mains Magique — validation Staging"].firstMatch.exists)
        capture(app, "owner-apercu")
        let stocks = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Vérifier les stocks")).firstMatch
        if !stocks.isHittable { app.swipeUp() }
        XCTAssertTrue(stocks.waitForExistence(timeout: 5)); stocks.press(forDuration: 0.1)
        XCTAssertTrue(app.navigationBars["Inventory"].waitForExistence(timeout: 8) || app.navigationBars["Inventaire"].exists)
        capture(app, "owner-stocks")
        app.navigationBars.buttons.element(boundBy: 0).press(forDuration: 0.1)
        app.tabBars.buttons["Gestion"].press(forDuration: 0.1)
        let locations = app.buttons["Emplacements"]
        XCTAssertTrue(locations.waitForExistence(timeout: 5)); locations.press(forDuration: 0.1)
        XCTAssertTrue(app.staticTexts["Mains Magique — validation Staging"].firstMatch.waitForExistence(timeout: 10))
        capture(app, "owner-emplacements")
    }

    func testCustomerCanBrowseTheImportedCatalogueAndItsOrderHistory() throws {
        let app = try launch("customer")
        XCTAssertTrue(app.tabBars.buttons["Menu"].waitForExistence(timeout: 30))
        app.tabBars.buttons["Menu"].firstMatch.press(forDuration: 0.1)
        let category = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Épicerie")).firstMatch
        XCTAssertTrue(category.waitForExistence(timeout: 25), "The real catalogue must decode successfully")
        category.press(forDuration: 0.1)
        XCTAssertTrue(app.staticTexts["Djondjon Liquide"].firstMatch.waitForExistence(timeout: 10))
        capture(app, "client-catalogue-reel")
        app.tabBars.buttons["Commandes"].press(forDuration: 0.1)
        XCTAssertTrue(app.navigationBars["Mes commandes"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.staticTexts["Vos commandes n’ont pas pu être chargées."].exists)
        capture(app, "client-commandes")
    }
}

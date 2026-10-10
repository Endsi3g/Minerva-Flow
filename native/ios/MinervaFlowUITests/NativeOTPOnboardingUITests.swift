import XCTest

final class NativeOTPOnboardingUITests: XCTestCase {
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

    override func setUpWithError() throws { continueAfterFailure = false }

    @MainActor
    func testRestaurantThenRealEmailCodeJoinsCustomerWorkspace() async throws {
        continueAfterFailure = false
        let env = ProcessInfo.processInfo.environment
        let mailbox = try XCTUnwrap(env["MV_OTP_TEST_EMAIL"])
        let parts = mailbox.split(separator: "@")
        XCTAssertEqual(parts.count, 2)
        let base = parts[0].split(separator: "+")[0]
        let email = "\(base)+mv-ios-otp-\(Int(Date().timeIntervalSince1970 * 1000))@\(parts[1])"
        if let directory = env["MV_SHOT_DIR"] {
            let fixture = URL(fileURLWithPath: directory).appendingPathComponent("otp-fixture-email.txt")
            try email.write(to: fixture, atomically: true, encoding: .utf8)
            try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fixture.path)
        }
        let restaurantId = try XCTUnwrap(env["MV_TEST_RESTAURANT_ID"])
        let app = XCUIApplication()
        app.launchArguments = ["-minervaUITestStaging", "-minervaUITestSignedOut"]
        for name in ["MV_TEST_SUPABASE_URL", "MV_TEST_SUPABASE_ANON_KEY", "MV_TEST_API_URL"] {
            app.launchEnvironment[name] = try XCTUnwrap(env[name])
        }
        app.launchEnvironment["MV_TEST_LANGUAGE"] = "fr"
        app.launch()
        let search = app.textFields["enrollmentSearch"]
        try require(search.waitForExistence(timeout: 20))
        search.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 3) { search.tap() }
        guard app.keyboards.firstMatch.waitForExistence(timeout: 5) else {
            XCTFail("Restaurant search did not acquire keyboard focus"); return
        }
        search.typeText("Mains Magique")
        app.buttons["Rechercher"].tap()
        let restaurant = app.buttons["enrollmentRestaurant:\(restaurantId)"]
        try require(restaurant.waitForExistence(timeout: 15))
        restaurant.tap()
        try require(app.buttons["publicMenuSignIn"].waitForExistence(timeout: 15))
        try require(app.staticTexts["Djondjon Liquide"].firstMatch.waitForExistence(timeout: 20))
        XCTAssertFalse(app.tabBars.buttons["Compte"].exists)
        app.buttons["publicMenuSignIn"].tap()
        let emailInput = app.textFields["authEmail"]
        try require(emailInput.waitForExistence(timeout: 10))
        emailInput.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 3) { emailInput.tap() }
        try require(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        emailInput.typeText(email)
        let terms = app.buttons["acceptTerms"]
        if !terms.isHittable { app.swipeUp() }
        try require(terms.waitForExistence(timeout: 5)); terms.tap()
        let sendCode = app.buttons["Recevoir le code"]
        if !sendCode.isHittable { app.swipeUp() }
        let enabled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true AND enabled == true AND hittable == true"), object: sendCode)
        XCTAssertEqual(XCTWaiter.wait(for: [enabled], timeout: 10), .completed)
        sendCode.tap()
        try require(app.textFields["authEmailCode"].waitForExistence(timeout: 20))
        let code = try await deliveredCode(to: email, key: XCTUnwrap(env["MV_TEST_RESEND_KEY"]))
        let codeInput = app.textFields["authEmailCode"]
        codeInput.tap(); codeInput.typeText(code)
        let firstName = app.textFields["customerFirstName"]
        try require(firstName.waitForExistence(timeout: 30))
        firstName.tap()
        if !app.keyboards.firstMatch.waitForExistence(timeout: 3) { firstName.tap() }
        try require(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        firstName.typeText("Camille")
        app.buttons["completeCustomerFirstName"].tap()
        try require(app.tabBars.buttons["Compte"].waitForExistence(timeout: 30))
        XCTAssertFalse(app.buttons["Fermer l'introduction"].exists, "The verified customer opens the home screen directly")
        XCTAssertFalse(app.tabBars.buttons["Gestion"].exists)
        try require(app.staticTexts["Mains Magique — validation Staging"].firstMatch.waitForExistence(timeout: 15))
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "onboarding-restaurant-otp-client"; attachment.lifetime = .keepAlways; add(attachment)
        if let directory = env["MV_SHOT_DIR"] {
            try app.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: directory).appendingPathComponent("onboarding-otp-client.png"))
        }
    }

    private func require(_ condition: Bool, file: StaticString = #filePath, line: UInt = #line) throws {
        guard condition else {
            XCTFail("Required onboarding UI state was not reached", file: file, line: line)
            throw NSError(domain: "NativeOTPOnboarding", code: 2, userInfo: [NSLocalizedDescriptionKey: "Stopped at the failed onboarding step."])
        }
    }

    private func deliveredCode(to email: String, key: String) async throws -> String {
        func get(_ path: String) async throws -> [String: Any] {
            var request = URLRequest(url: URL(string: "https://api.resend.com/\(path)")!)
            request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        }
        let deadline = Date().addingTimeInterval(90)
        while Date() < deadline {
            let messages = try await get("emails")["data"] as? [[String: Any]] ?? []
            if let message = messages.first(where: { ($0["to"] as? [String])?.contains(email) == true }),
               let id = message["id"] as? String {
                let detail = try await get("emails/\(id)")
                if detail["last_event"] as? String == "delivered", let subject = detail["subject"] as? String {
                    let code = String(subject.prefix(6))
                    if code.count == 6 && code.allSatisfy(\.isNumber) { return code }
                }
            }
            try await Task.sleep(nanoseconds: 2_000_000_000)
        }
        throw NSError(domain: "NativeOTPOnboarding", code: 1, userInfo: [NSLocalizedDescriptionKey: "No delivered six-digit email code reached the controlled mailbox."])
    }
}

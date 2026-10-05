import XCTest
@testable import MinervaFlow

/// A tag can say anything — only first-party touchpoint/referral links may be routed.
final class NFCTagURLTests: XCTestCase {
    private func validated(_ string: String) -> URL? {
        URL(string: string).flatMap(NFCTagURL.validated)
    }

    func testAcceptsFirstPartyTouchpointAndReferralLinks() {
        XCTAssertNotNil(validated("https://minervaflow.app/t/ABCD1234"))
        XCTAssertNotNil(validated("https://www.minervaflow.app/t/ABCD1234"))
        XCTAssertNotNil(validated("https://minervaflow.app/p/xYz_09-ab"))
        XCTAssertNotNil(validated("https://minervaflow.app/en/t/ABCD1234"), "locale prefix is allowed")
        XCTAssertNotNil(validated("https://MINERVAFLOW.APP/t/ABCD1234"), "host comparison is case-insensitive")
    }

    func testRejectsOtherHostsAndLookalikes() {
        XCTAssertNil(validated("https://evil.example/t/ABCD1234"))
        XCTAssertNil(validated("https://minervaflow.app.evil.example/t/ABCD1234"))
        XCTAssertNil(validated("https://notminervaflow.app/t/ABCD1234"))
        XCTAssertNil(validated("https://minervaflow.app@evil.example/t/ABCD1234"), "userinfo trick resolves to evil.example")
    }

    func testRejectsNonHTTPSAndUnexpectedAuthority() {
        XCTAssertNil(validated("http://minervaflow.app/t/ABCD1234"))
        XCTAssertNil(validated("minervaflow://home"))
        XCTAssertNil(validated("https://minervaflow.app:8443/t/ABCD1234"))
        XCTAssertNil(validated("https://user:pass@minervaflow.app/t/ABCD1234"))
        XCTAssertNil(validated("tel:+15145550100"))
    }

    func testRejectsUnexpectedPathsAndCodes() {
        XCTAssertNil(validated("https://minervaflow.app/"))
        XCTAssertNil(validated("https://minervaflow.app/login"))
        XCTAssertNil(validated("https://minervaflow.app/admin/restaurants"))
        XCTAssertNil(validated("https://minervaflow.app/t/ABCD1234/extra"))
        XCTAssertNil(validated("https://minervaflow.app/t/abc"), "code too short")
        XCTAssertNil(validated("https://minervaflow.app/t/AB%20CD1234"), "code with a space")
        XCTAssertNil(validated("https://minervaflow.app/t/..%2Fadmin"), "path traversal")
        XCTAssertNil(validated("https://minervaflow.app/x/ABCD1234"), "unknown route")
    }

    func testBuildsTheSameTouchpointURLTheWebPrints() {
        XCTAssertEqual(NFCTagURL.touchpointURL(code: "ABCD1234")?.absoluteString, "https://minervaflow.app/t/ABCD1234")
        XCTAssertNil(NFCTagURL.touchpointURL(code: "bad code"))
        XCTAssertNil(NFCTagURL.touchpointURL(code: "../x"))
        XCTAssertNil(NFCTagURL.touchpointURL(code: ""))
    }
}

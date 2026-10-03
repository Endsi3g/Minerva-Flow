import XCTest
@testable import MinervaFlow

final class ConfigTests: XCTestCase {
    /// The apex domain answers with a 308 redirect to www, and URLSession drops
    /// the Authorization header when a redirect changes host: every
    /// authenticated bridge call (menu, restaurant, referrals, discovery) then
    /// reaches the server unauthenticated. The API base URL must be the www host.
    func testAPIBaseURLIsTheWWWHostSoNoRedirectDropsAuthorization() {
        XCTAssertEqual(Config.apiBaseURL.scheme, "https")
        XCTAssertEqual(Config.apiBaseURL.host, "www.minervaflow.app")
    }

    func testLinksPrintedOnQRAndNFCStayOnTheApexDeclaredForUniversalLinks() {
        XCTAssertEqual(Config.publicLinkBaseURL.host, "minervaflow.app")
        XCTAssertTrue(NFCTagURL.allowedHosts.contains(Config.publicLinkBaseURL.host ?? ""))
    }

    func testPublicDocumentURLsAreDerivedFromTheSameHost() {
        XCTAssertEqual(Config.privacyPolicyURL.host, Config.apiBaseURL.host)
        XCTAssertEqual(Config.termsURL.host, Config.apiBaseURL.host)
    }
}

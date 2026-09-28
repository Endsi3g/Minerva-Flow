import XCTest
@testable import MinervaFlow

final class NativeOwnerAPIURLTests: XCTestCase {
    private let baseURL = URL(string: "https://minervaflow.app")!

    func testAddsRestaurantScopeToOwnerGetRequests() throws {
        let url = try XCTUnwrap(NativeOwnerAPIURL.make(
            path: "/api/native/owner/google-business-profile/reviews",
            baseURL: baseURL,
            restaurantId: "restaurant-123"
        ))
        let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems

        XCTAssertEqual(url.path, "/api/native/owner/google-business-profile/reviews")
        XCTAssertEqual(query?.first(where: { $0.name == "restaurantId" })?.value, "restaurant-123")
    }

    func testReplacesOldRestaurantScopeAndPreservesOtherQueryItems() throws {
        let url = try XCTUnwrap(NativeOwnerAPIURL.make(
            path: "/api/native/owner/google-business-profile/reviews?pageToken=next&restaurantId=old",
            baseURL: baseURL,
            restaurantId: "restaurant-new"
        ))
        let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []

        XCTAssertEqual(query.filter { $0.name == "restaurantId" }.count, 1)
        XCTAssertEqual(query.first(where: { $0.name == "restaurantId" })?.value, "restaurant-new")
        XCTAssertEqual(query.first(where: { $0.name == "pageToken" })?.value, "next")
    }

    func testEncodesRestaurantIdentifiersAsQueryValues() throws {
        let restaurantId = "restaurant & café"
        let url = try XCTUnwrap(NativeOwnerAPIURL.make(
            path: "/api/native/owner/google-business-profile",
            baseURL: baseURL,
            restaurantId: restaurantId
        ))
        let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems

        XCTAssertEqual(query?.first(where: { $0.name == "restaurantId" })?.value, restaurantId)
    }

    func testEncodesReviewPageTokenAlongsideRestaurantScope() throws {
        let pageToken = "cursor +/ café"
        let url = try XCTUnwrap(NativeOwnerAPIURL.make(
            path: "/api/native/owner/google-business-profile/reviews",
            baseURL: baseURL,
            restaurantId: "restaurant-123",
            queryItems: [URLQueryItem(name: "pageToken", value: pageToken)]
        ))
        let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []

        XCTAssertEqual(query.first(where: { $0.name == "pageToken" })?.value, pageToken)
        XCTAssertEqual(query.first(where: { $0.name == "restaurantId" })?.value, "restaurant-123")
    }

    func testRejectsAnEmptyRestaurantIdentifier() {
        XCTAssertNil(NativeOwnerAPIURL.make(
            path: "/api/native/owner/google-business-profile",
            baseURL: baseURL,
            restaurantId: ""
        ))
    }
}

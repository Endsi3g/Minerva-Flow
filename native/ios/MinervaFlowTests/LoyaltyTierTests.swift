import XCTest
@testable import MinervaFlow

final class LoyaltyTierTests: XCTestCase {
    func testBelowTier2ThresholdIsHabitue() {
        XCTAssertEqual(LoyaltyTier.resolve(totalSpent: 0, tier2: 150, tier3: 400), .habitue)
        XCTAssertEqual(LoyaltyTier.resolve(totalSpent: 149.99, tier2: 150, tier3: 400), .habitue)
    }

    func testExactlyAtTier2ThresholdIsPrivilegie() {
        XCTAssertEqual(LoyaltyTier.resolve(totalSpent: 150, tier2: 150, tier3: 400), .privilegie)
    }

    func testBetweenTier2AndTier3IsPrivilegie() {
        XCTAssertEqual(LoyaltyTier.resolve(totalSpent: 399.99, tier2: 150, tier3: 400), .privilegie)
    }

    func testExactlyAtTier3ThresholdIsAmbassadeur() {
        XCTAssertEqual(LoyaltyTier.resolve(totalSpent: 400, tier2: 150, tier3: 400), .ambassadeur)
    }

    func testWellAboveTier3IsAmbassadeur() {
        XCTAssertEqual(LoyaltyTier.resolve(totalSpent: 10_000, tier2: 150, tier3: 400), .ambassadeur)
    }

    func testRespectsRestaurantSpecificThresholds() {
        // A restaurant configuring unusually low thresholds shouldn't fall
        // back to the 150/400 defaults for its own customers.
        XCTAssertEqual(LoyaltyTier.resolve(totalSpent: 50, tier2: 40, tier3: 80), .privilegie)
        XCTAssertEqual(LoyaltyTier.resolve(totalSpent: 90, tier2: 40, tier3: 80), .ambassadeur)
    }
}

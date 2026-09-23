import XCTest
@testable import MinervaFlow

final class BirthdayOfferEligibilityTests: XCTestCase {
    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar.date(from: DateComponents(year: year, month: month, day: day))!
    }

    func testMatchesMonthAndDayWithoutTimezoneConversion() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!

        XCTAssertTrue(BirthdayOfferEligibility.isBirthdayToday("1994-06-18", today: date(2026, 6, 18), calendar: calendar))
        XCTAssertFalse(BirthdayOfferEligibility.isBirthdayToday("1994-06-19", today: date(2026, 6, 18), calendar: calendar))
    }

    func testLeapDayBirthdayUsesFebruaryTwentyEighthInNonLeapYears() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!

        XCTAssertTrue(BirthdayOfferEligibility.isBirthdayToday("2000-02-29", today: date(2025, 2, 28), calendar: calendar))
        XCTAssertFalse(BirthdayOfferEligibility.isBirthdayToday("2000-02-29", today: date(2025, 3, 1), calendar: calendar))
        XCTAssertTrue(BirthdayOfferEligibility.isBirthdayToday("2000-02-29", today: date(2024, 2, 29), calendar: calendar))
    }

    func testMissingAndMalformedBirthdaysAreIneligible() {
        XCTAssertFalse(BirthdayOfferEligibility.isBirthdayToday(nil, today: date(2026, 1, 1)))
        XCTAssertFalse(BirthdayOfferEligibility.isBirthdayToday("not-a-date", today: date(2026, 1, 1)))
        XCTAssertFalse(BirthdayOfferEligibility.isBirthdayToday("1994-02-31", today: date(2026, 2, 28)))
        XCTAssertFalse(BirthdayOfferEligibility.isBirthdayToday("1994-13-01", today: date(2026, 1, 1)))
    }
}

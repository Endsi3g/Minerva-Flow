import XCTest
@testable import MinervaFlow

final class OrderTotalsTests: XCTestCase {
    private func makeItem(price: Double) -> NativeMenuItem {
        NativeMenuItem(
            id: UUID().uuidString,
            restaurantId: "r1",
            name: "Café",
            category: "Boissons",
            price: price,
            description: nil,
            active: true,
            imageUrl: nil,
            imageUrls: []
        )
    }

    func testSubtotalMultipliesPriceByQuantity() {
        let totals = OrderTotals(lines: [(makeItem(price: 4.50), 3)], taxRate: 0, tipPct: nil)
        XCTAssertEqual(totals.subtotal, 13.50, accuracy: 0.0001)
    }

    func testQuebecTaxRateAppliedToSubtotal() {
        // The 14.975% default Quebec combined rate used across the app.
        let totals = OrderTotals(lines: [(makeItem(price: 10), 1)], taxRate: 0.14975, tipPct: nil)
        XCTAssertEqual(totals.taxAmount, 1.50, accuracy: 0.01)
    }

    func testNoTipWhenTipPctIsNil() {
        let totals = OrderTotals(lines: [(makeItem(price: 10), 1)], taxRate: 0, tipPct: nil)
        XCTAssertEqual(totals.tipAmount, 0)
    }

    func testTipComputedOnSubtotalNotOnTotal() {
        let totals = OrderTotals(lines: [(makeItem(price: 100), 1)], taxRate: 0.14975, tipPct: 0.15)
        // Tip is 15% of the $100 subtotal ($15), not 15% of a
        // tax-inflated total — a real receipt never compounds tip on tax.
        XCTAssertEqual(totals.tipAmount, 15.00, accuracy: 0.01)
    }

    func testTotalSumsAllThreeComponents() {
        let totals = OrderTotals(lines: [(makeItem(price: 20), 2)], taxRate: 0.14975, tipPct: 0.10)
        XCTAssertEqual(totals.total, totals.subtotal + totals.taxAmount + totals.tipAmount, accuracy: 0.0001)
    }

    func testMultipleLinesSumCorrectly() {
        let totals = OrderTotals(
            lines: [(makeItem(price: 3.25), 2), (makeItem(price: 5.00), 1)],
            taxRate: 0,
            tipPct: nil
        )
        XCTAssertEqual(totals.subtotal, 11.50, accuracy: 0.0001)
    }

    func testEmptyCartProducesZeroTotals() {
        let totals = OrderTotals(lines: [], taxRate: 0.14975, tipPct: 0.15)
        XCTAssertEqual(totals.subtotal, 0)
        XCTAssertEqual(totals.taxAmount, 0)
        XCTAssertEqual(totals.tipAmount, 0)
        XCTAssertEqual(totals.total, 0)
    }
}

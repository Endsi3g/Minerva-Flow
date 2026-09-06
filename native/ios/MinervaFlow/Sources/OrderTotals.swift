import Foundation

/// Pure order-total math extracted out of CheckoutSheet so it can be unit
/// tested without spinning up a SwiftUI view hierarchy — cart subtotal,
/// tax, tip and grand total for a set of cart lines. Behavior is
/// unchanged from the inline computed properties it replaces: each
/// currency component is independently rounded to cents before summing,
/// matching how a real receipt breaks down (not rounding only the final
/// total), so 1/3-cent tax/tip splits can't silently drift the displayed
/// total from what's actually charged.
struct OrderTotals {
    let subtotal: Double
    let taxAmount: Double
    let tipAmount: Double
    let total: Double

    init(lines: [(item: NativeMenuItem, quantity: Int)], taxRate: Double, tipPct: Double?) {
        let subtotal = lines.reduce(0) { $0 + $1.item.price * Double($1.quantity) }
        let taxAmount = Self.roundedToCents(subtotal * taxRate)
        let tipAmount = tipPct.map { Self.roundedToCents(subtotal * $0) } ?? 0
        self.subtotal = subtotal
        self.taxAmount = taxAmount
        self.tipAmount = tipAmount
        self.total = subtotal + taxAmount + tipAmount
    }

    private static func roundedToCents(_ amount: Double) -> Double {
        (amount * 100).rounded() / 100
    }
}

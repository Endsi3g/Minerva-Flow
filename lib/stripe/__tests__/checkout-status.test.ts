import { describe, expect, it } from "vitest";
import { classifyServiceQuoteCheckout, resolveServiceQuoteCheckoutStatus } from "../checkout-status";

describe("classifyServiceQuoteCheckout", () => {
  it("confirms only completed service-quote sessions paid by Stripe", () => {
    expect(classifyServiceQuoteCheckout({
      metadata: { kind: "service_quote" }, status: "complete", payment_status: "paid",
    })).toBe("paid");
  });

  it("keeps delayed payments pending until Stripe confirms them", () => {
    expect(classifyServiceQuoteCheckout({
      metadata: { kind: "service_quote" }, status: "complete", payment_status: "unpaid",
    })).toBe("pending");
  });

  it.each([
    { metadata: { kind: "portal_order" }, status: "complete", payment_status: "paid" },
    { metadata: { kind: "service_quote" }, status: "open", payment_status: "unpaid" },
    { metadata: { kind: "service_quote" }, status: "complete", payment_status: "no_payment_required" },
  ] as const)("rejects a non-quote, incomplete, or unpaid session", (session) => {
    expect(classifyServiceQuoteCheckout(session)).toBe("invalid");
  });
});

describe("resolveServiceQuoteCheckoutStatus", () => {
  it("confirms only after the paid quote has an operational order", () => {
    expect(resolveServiceQuoteCheckoutStatus("paid", { status: "converted", converted_order_id: "order-1" })).toBe("paid");
    expect(resolveServiceQuoteCheckoutStatus("paid", { status: "quoted", converted_order_id: null })).toBe("processing");
    expect(resolveServiceQuoteCheckoutStatus("paid", null)).toBe("processing");
  });

  it("never promotes a pending or invalid Stripe session because of database state", () => {
    const converted = { status: "converted", converted_order_id: "order-1" };
    expect(resolveServiceQuoteCheckoutStatus("pending", converted)).toBe("pending");
    expect(resolveServiceQuoteCheckoutStatus("invalid", converted)).toBe("invalid");
  });
});

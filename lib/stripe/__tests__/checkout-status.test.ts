import { describe, expect, it } from "vitest";
import {
  classifyServiceQuoteCheckout,
  portalOrderCheckoutIdempotencyKey,
  resolvePortalOrderCheckoutAction,
  resolveServiceQuoteCheckoutStatus,
} from "../checkout-status";

describe("portal order Checkout retry policy", () => {
  it("reuses only an open unpaid session with an active URL", () => {
    expect(resolvePortalOrderCheckoutAction({ status: "open", paymentStatus: "unpaid", url: "https://checkout.stripe.com/session" }))
      .toBe("reuse");
  });

  it("creates a replacement only for an expired unpaid session", () => {
    expect(resolvePortalOrderCheckoutAction({ status: "expired", paymentStatus: "unpaid", url: null })).toBe("retry");
  });

  it("confirms paid sessions and blocks completed unpaid sessions", () => {
    expect(resolvePortalOrderCheckoutAction({ status: "complete", paymentStatus: "paid", url: null })).toBe("paid");
    expect(resolvePortalOrderCheckoutAction({ status: "complete", paymentStatus: "unpaid", url: null })).toBe("blocked");
  });

  it("uses deterministic, attempt-specific Stripe keys for expired-session retries", () => {
    const priorSession = "cs_test_abc123";
    const firstRetry = portalOrderCheckoutIdempotencyKey("order-1", priorSession);
    expect(firstRetry).toBe(portalOrderCheckoutIdempotencyKey("order-1", priorSession));
    expect(firstRetry).not.toBe(portalOrderCheckoutIdempotencyKey("order-1", "cs_test_other"));
    expect(portalOrderCheckoutIdempotencyKey("order-1")).toBe("portal-order-order-1");
    expect(firstRetry.length).toBeLessThanOrEqual(255);
  });
});

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

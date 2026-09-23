import { describe, expect, it } from "vitest";
import { validateServiceQuoteCheckoutPayment, type ServiceQuoteCheckoutPaymentInput } from "../service-quote-payment";

const valid: ServiceQuoteCheckoutPaymentInput = {
  eventAccount: null,
  expectedConnectedAccountId: "acct_restaurant",
  paymentIntentStatus: "succeeded",
  transferDestinationAccountId: "acct_restaurant",
  expectedQuote: {
    id: "quote-1",
    restaurantId: "restaurant-1",
    checkoutSessionId: "cs_1",
    status: "quoted",
    currency: "CAD",
    depositAmount: 45.67,
  },
  session: {
    id: "cs_1",
    mode: "payment",
    status: "complete",
    paymentStatus: "paid",
    amountTotal: 4567,
    currency: "cad",
    metadata: { kind: "service_quote", quoteId: "quote-1", restaurantId: "restaurant-1" },
  },
};

describe("validateServiceQuoteCheckoutPayment", () => {
  it("accepts the exact paid Connect session persisted for the quote", () => {
    expect(validateServiceQuoteCheckoutPayment(valid)).toBeNull();
  });

  it.each([
    ["connected-account event for a platform-created destination charge", { eventAccount: "acct_restaurant" }],
    ["wrong transfer destination", { transferDestinationAccountId: "acct_other" }],
    ["wrong restaurant metadata", { session: { ...valid.session, metadata: { ...valid.session.metadata!, restaurantId: "restaurant-other" } } }],
    ["wrong quote metadata", { session: { ...valid.session, metadata: { ...valid.session.metadata!, quoteId: "quote-other" } } }],
    ["wrong checkout session", { expectedQuote: { ...valid.expectedQuote, checkoutSessionId: "cs_other" } }],
    ["wrong amount", { session: { ...valid.session, amountTotal: 1 } }],
    ["wrong currency", { session: { ...valid.session, currency: "usd" } }],
    ["unpaid session", { session: { ...valid.session, paymentStatus: "unpaid" } }],
    ["unfinished payment intent", { paymentIntentStatus: "processing" }],
    ["non-payment mode", { session: { ...valid.session, mode: "subscription" } }],
  ])("rejects %s", (_label, patch) => {
    expect(validateServiceQuoteCheckoutPayment({ ...valid, ...patch } as ServiceQuoteCheckoutPaymentInput)).not.toBeNull();
  });
});

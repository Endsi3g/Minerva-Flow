import type Stripe from "stripe";

export type StripeQuotePaymentStatus = "paid" | "pending" | "invalid";
export type ServiceQuoteCheckoutStatus = StripeQuotePaymentStatus | "processing";
export type PortalOrderCheckoutAction = "paid" | "reuse" | "retry" | "blocked";

/** Stable per order/session replacement; concurrent retries converge. */
export function portalOrderCheckoutIdempotencyKey(orderId: string, retryOfSessionId?: string): string {
  return retryOfSessionId
    ? `portal-order-${orderId}-retry-${retryOfSessionId}`
    : `portal-order-${orderId}`;
}

/**
 * Only an active Checkout URL may be reused. Stripe Checkout Sessions are
 * immutable after expiry, so a retry must create a new session; a completed
 * but unpaid session is intentionally blocked to avoid a duplicate charge.
 */
export function resolvePortalOrderCheckoutAction(session: {
  status: Stripe.Checkout.Session.Status | null;
  paymentStatus: Stripe.Checkout.Session.PaymentStatus;
  url: string | null;
}): PortalOrderCheckoutAction {
  if (session.paymentStatus === "paid") return "paid";
  if (session.status === "expired" && session.paymentStatus === "unpaid") return "retry";
  if (session.status === "open" && session.paymentStatus === "unpaid" && session.url) return "reuse";
  return "blocked";
}

/** Accept only a completed, paid Checkout Session explicitly created for a service quote. */
export function classifyServiceQuoteCheckout(
  session: Pick<Stripe.Checkout.Session, "metadata" | "payment_status" | "status">
): StripeQuotePaymentStatus {
  if (session.metadata?.kind !== "service_quote" || session.status !== "complete") return "invalid";
  if (session.payment_status === "paid") return "paid";
  if (session.payment_status === "unpaid") return "pending";
  return "invalid";
}

/** A paid Stripe session is not an operationally complete order until the webhook has converted it. */
export function resolveServiceQuoteCheckoutStatus(
  stripeStatus: StripeQuotePaymentStatus,
  quote: { status: string; converted_order_id: string | null } | null
): ServiceQuoteCheckoutStatus {
  if (stripeStatus !== "paid") return stripeStatus;
  return quote?.status === "converted" && quote.converted_order_id ? "paid" : "processing";
}

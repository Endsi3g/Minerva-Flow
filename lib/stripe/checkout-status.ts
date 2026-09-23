import type Stripe from "stripe";

export type StripeQuotePaymentStatus = "paid" | "pending" | "invalid";
export type ServiceQuoteCheckoutStatus = StripeQuotePaymentStatus | "processing";

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

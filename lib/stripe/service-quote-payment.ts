export type ServiceQuoteCheckoutPaymentInput = {
  eventAccount: string | null;
  expectedConnectedAccountId: string | null;
  paymentIntentStatus: string | null;
  transferDestinationAccountId: string | null;
  expectedQuote: {
    id: string;
    restaurantId: string;
    checkoutSessionId: string | null;
    status: string;
    currency: string;
    depositAmount: number | null;
  };
  session: {
    id: string;
    mode: string | null;
    status: string | null;
    paymentStatus: string | null;
    amountTotal: number | null;
    currency: string | null;
    metadata: Record<string, string> | null;
  };
};

/** Validates a paid Stripe Connect session against the persisted quote before conversion. */
export function validateServiceQuoteCheckoutPayment(input: ServiceQuoteCheckoutPaymentInput): string | null {
  const { eventAccount, expectedConnectedAccountId, paymentIntentStatus, transferDestinationAccountId, expectedQuote, session } = input;
  // The code creates destination charges on the platform account. Their
  // webhook is a platform event (account=null), while the PaymentIntent's
  // transfer_data.destination identifies the restaurant receiving funds.
  if (!expectedConnectedAccountId || eventAccount !== null || transferDestinationAccountId !== expectedConnectedAccountId) {
    return "connected_account_mismatch";
  }
  if (paymentIntentStatus !== "succeeded") return "payment_intent_not_succeeded";
  if (session.mode !== "payment" || session.status !== "complete" || session.paymentStatus !== "paid") return "session_not_paid";
  if (session.metadata?.kind !== "service_quote" || session.metadata.quoteId !== expectedQuote.id) return "quote_metadata_mismatch";
  if (session.metadata.restaurantId !== expectedQuote.restaurantId) return "restaurant_metadata_mismatch";
  if (expectedQuote.status !== "quoted" && expectedQuote.status !== "converted") return "quote_not_payable";
  if (expectedQuote.checkoutSessionId !== session.id) return "checkout_session_mismatch";
  if (!Number.isSafeInteger(session.amountTotal) || session.amountTotal! <= 0) return "amount_missing";
  if (!Number.isFinite(expectedQuote.depositAmount) || expectedQuote.depositAmount! <= 0) return "quote_amount_missing";
  if (session.amountTotal !== Math.round(expectedQuote.depositAmount! * 100)) return "amount_mismatch";
  if (!session.currency || session.currency.toLowerCase() !== expectedQuote.currency.toLowerCase()) return "currency_mismatch";
  return null;
}

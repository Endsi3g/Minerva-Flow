import Stripe from "stripe";

/**
 * GitHub (and so the Stripe CLI download) isn't reachable from the sandbox
 * this suite was authored in, so there's no `stripe listen` to forward real
 * webhook deliveries to localhost during a test run. These helpers instead
 * drive the real Stripe test-mode API directly and construct a
 * correctly-signed synthetic event with the same STRIPE_WEBHOOK_SECRET the
 * app's /api/stripe/webhook route verifies against — exercising the exact
 * signature-verification + handler code path Stripe's own delivery would,
 * without depending on a network hop this environment can't receive.
 *
 * Requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*_MONTHLY
 * to be set (see .env.local) — every test in billing.spec.ts that uses this
 * skips itself via test.skip() when they're absent instead of failing.
 */

export function stripeConfiguredForTests(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_STARTER_MONTHLY
  );
}

let stripeClient: Stripe | null = null;
export function testStripeClient(): Stripe {
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripeClient;
}

/** Signs a Stripe event payload with the app's local webhook secret, Stripe's own way. */
export function signWebhookPayload(event: unknown): { payload: string; signature: string } {
  const payload = JSON.stringify(event);
  const signature = testStripeClient().webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return { payload, signature };
}

/** POSTs a synthetic, correctly-signed event straight to the app's webhook route. */
export async function deliverWebhookEvent(baseURL: string, event: unknown): Promise<Response> {
  const { payload, signature } = signWebhookPayload(event);
  return fetch(`${baseURL}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
}

/**
 * Creates a real Stripe test-mode customer + subscription directly via the
 * API, using Stripe's always-available test PaymentMethod (`pm_card_visa`)
 * — this is what a completed Checkout session would have produced, without
 * automating Stripe's own hosted checkout UI (whose DOM/iframe structure
 * this suite has no way to visually verify from this environment, and
 * which would test Stripe's page more than ours). The pricing-table →
 * "redirects to Stripe" step is covered separately by asserting the
 * checkout URL our own createCheckoutSessionAction returns.
 */
export async function createTestSubscription(input: {
  priceId: string;
  workspaceId: string;
  tier: string;
  interval: string;
  email: string;
}): Promise<{ customerId: string; subscription: Stripe.Subscription }> {
  const stripe = testStripeClient();
  const customer = await stripe.customers.create({
    email: input.email,
    payment_method: "pm_card_visa",
    invoice_settings: { default_payment_method: "pm_card_visa" },
  });
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: input.priceId }],
    metadata: { workspaceId: input.workspaceId, tier: input.tier, interval: input.interval },
  });
  return { customerId: customer.id, subscription };
}

export function buildCheckoutCompletedEvent(input: {
  workspaceId: string;
  customerId: string;
  subscriptionId: string;
}) {
  return {
    id: `evt_test_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        object: "checkout.session",
        metadata: { workspaceId: input.workspaceId },
        customer: input.customerId,
        subscription: input.subscriptionId,
      },
    },
  };
}

export function buildSubscriptionUpdatedEvent(subscription: Stripe.Subscription, previousStatus?: string) {
  return {
    id: `evt_test_${Date.now()}`,
    object: "event",
    type: "customer.subscription.updated",
    data: {
      object: subscription,
      previous_attributes: previousStatus ? { status: previousStatus } : {},
    },
  };
}

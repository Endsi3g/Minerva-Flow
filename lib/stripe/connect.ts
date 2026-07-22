import "server-only";
import { getStripeClient } from "@/lib/stripe/config";

/**
 * Same platform secret key as billing (lib/stripe/config.ts) — Connect
 * just needs the Connect product enabled on the platform account in the
 * Stripe dashboard, which isn't something an env var can detect.
 */
export function isStripeConnectConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function connectFeeBasisPoints(): number {
  const raw = Number(process.env.STRIPE_CONNECT_FEE_PERCENT ?? "0");
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, raw)) * 100;
}

export async function createExpressAccount(email: string | null): Promise<string> {
  const stripe = getStripeClient();
  const account = await stripe.accounts.create({
    type: "express",
    country: "CA",
    email: email ?? undefined,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
  });
  return account.id;
}

export async function createOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripeClient();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

export type ConnectAccountState = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export async function retrieveAccountState(accountId: string): Promise<ConnectAccountState> {
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
  };
}

/**
 * Destination charge: created on the platform account (this key), money
 * flows to the restaurant's own Connect account minus
 * application_fee_amount. amountCents must already be the final,
 * server-recomputed total (lib/data/order-pricing.ts) — never trust a
 * client-submitted amount here.
 */
export async function createOrderPaymentIntent(input: {
  orderId: string;
  restaurantId: string;
  connectedAccountId: string;
  amountCents: number;
}): Promise<{ id: string; clientSecret: string }> {
  const stripe = getStripeClient();
  const fee = Math.min(input.amountCents, Math.round((input.amountCents * connectFeeBasisPoints()) / 10000));
  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: "cad",
    automatic_payment_methods: { enabled: true },
    application_fee_amount: fee,
    transfer_data: { destination: input.connectedAccountId },
    metadata: { orderId: input.orderId, restaurantId: input.restaurantId },
  });
  if (!intent.client_secret) throw new Error("Stripe n'a pas retourné de client_secret.");
  return { id: intent.id, clientSecret: intent.client_secret };
}

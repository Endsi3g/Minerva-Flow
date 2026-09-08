"use server";

import { headers } from "next/headers";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getStripeClient, isNfcCardPurchaseConfigured, stripeNfcCardPriceId } from "@/lib/stripe/config";

async function originUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

/**
 * $75 CAD one-time "carte NFC personnalisée" — a real physical order Kael
 * ships manually, not a subscription. mode: "payment" (not "subscription"),
 * with Stripe's own shipping_address_collection so there's no separate
 * address form to build; the webhook (checkout.session.completed) is what
 * actually creates the nfc_card_orders row once payment is confirmed.
 */
export async function createNfcCardOrderCheckoutAction(
  restaurantId: string,
  quantity: number
): Promise<string | null> {
  if (!isNfcCardPurchaseConfigured()) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) return null;

  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId) return null;
  if (membership.role !== "owner" && membership.role !== "manager") return null;

  const stripe = getStripeClient();
  const origin = await originUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripeNfcCardPriceId(), quantity }],
    shipping_address_collection: { allowed_countries: ["CA", "US"] },
    metadata: { kind: "nfc_card_order", restaurantId, quantity: String(quantity) },
    success_url: `${origin}/fidelisation/points-de-contact?nfc_order=success`,
    cancel_url: `${origin}/fidelisation/points-de-contact?nfc_order=cancelled`,
  });

  return session.url;
}

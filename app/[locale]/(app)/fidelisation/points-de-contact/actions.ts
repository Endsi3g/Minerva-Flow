"use server";

import { headers } from "next/headers";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getStripeClient, isNfcCardPurchaseConfigured, stripeNfcCardPriceId } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

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
  quantity: number,
  touchpointId: string | null = null
): Promise<string | null> {
  if (!isNfcCardPurchaseConfigured()) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) return null;

  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId) return null;
  if (membership.role !== "owner" && membership.role !== "manager") return null;

  // Confirm the chosen touchpoint actually belongs to this restaurant
  // (session-scoped client, so physical_touchpoints' own RLS is the real
  // check) — touchpointId otherwise arrives as a plain client-supplied
  // string with nothing else stopping it from pointing at someone else's
  // touchpoint before it reaches the webhook's admin-client insert.
  let verifiedTouchpointId: string | null = null;
  if (touchpointId) {
    const supabase = await createClient();
    const { data: touchpoint } = await supabase
      .from("physical_touchpoints")
      .select("id")
      .eq("id", touchpointId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    verifiedTouchpointId = touchpoint?.id ?? null;
  }

  const stripe = getStripeClient();
  const origin = await originUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: stripeNfcCardPriceId(), quantity }],
    shipping_address_collection: { allowed_countries: ["CA", "US"] },
    metadata: {
      kind: "nfc_card_order",
      restaurantId,
      quantity: String(quantity),
      touchpointId: verifiedTouchpointId ?? "",
    },
    success_url: `${origin}/fidelisation/points-de-contact?nfc_order=success`,
    cancel_url: `${origin}/fidelisation/points-de-contact?nfc_order=cancelled`,
  });

  return session.url;
}

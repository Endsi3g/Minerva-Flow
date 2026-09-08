import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NfcCardOrder, NfcCardOrderStatus } from "@/lib/types";

type NfcCardOrderRow = {
  id: string;
  restaurant_id: string;
  quantity: number;
  unit_price_cad: number;
  total_amount_cad: number;
  status: NfcCardOrderStatus;
  shipping_name: string | null;
  created_at: string;
};

function mapNfcCardOrder(row: NfcCardOrderRow): NfcCardOrder {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    quantity: row.quantity,
    unitPriceCad: row.unit_price_cad,
    totalAmountCad: row.total_amount_cad,
    status: row.status,
    shippingName: row.shipping_name,
    createdAt: row.created_at,
  };
}

export async function getNfcCardOrdersForRestaurant(restaurantId: string): Promise<NfcCardOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nfc_card_orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as NfcCardOrderRow[]).map(mapNfcCardOrder);
}

/**
 * Called only from the Stripe webhook once checkout.session.completed
 * confirms real payment (app/api/stripe/webhook/route.ts) — never from a
 * client-facing action, so there's no "pending" row for an abandoned
 * Checkout session cluttering the restaurant's order history.
 */
export async function recordPaidNfcCardOrder(input: {
  restaurantId: string;
  quantity: number;
  unitPriceCad: number;
  totalAmountCad: number;
  shippingName: string | null;
  shippingAddress: Record<string, unknown> | null;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("nfc_card_orders").insert({
    restaurant_id: input.restaurantId,
    quantity: input.quantity,
    unit_price_cad: input.unitPriceCad,
    total_amount_cad: input.totalAmountCad,
    status: "paid",
    shipping_name: input.shippingName,
    shipping_address: input.shippingAddress,
    stripe_checkout_session_id: input.stripeCheckoutSessionId,
    stripe_payment_intent_id: input.stripePaymentIntentId,
  });
}

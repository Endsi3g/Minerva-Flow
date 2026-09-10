import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderReadyNotification, markOrderReadyNotified } from "@/lib/orders/ready-notification";
import type { OrderFulfillmentMode, OrderPaymentStatus, OrderStatus } from "@/lib/types";

type DueOrderRow = {
  id: string;
  restaurant_id: string;
  status: OrderStatus;
  guest_name: string;
  guest_phone: string | null;
  customer_id: string | null;
  fulfillment_mode: OrderFulfillmentMode | null;
  payment_status: OrderPaymentStatus;
};

/**
 * Runs every 5 minutes (see vercel.json). Finds orders whose
 * estimated_ready_at has elapsed and haven't been notified yet
 * (ready_notified_at null) — the counterpart to the manual "Notifier"
 * button on /commandes (see notifyOrderReadyAction), firing on its own
 * once the owner's configured delay (or a staff override, see
 * updateOrderEstimatedReadyAt) runs out.
 *
 * Never promises "c'est prêt" on an order the payment gate would still
 * block from prep (updateOrderStatus's same isAwaitingPayment check) —
 * an unpaid "immediat"/"prep_apres_paiement" order just sits past its ETA
 * unnotified until it's paid or cancelled, same as it already sits out of
 * "À Préparer" on the KDS board.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: dueOrders } = await admin
    .from("orders")
    .select("id, restaurant_id, status, guest_name, guest_phone, customer_id, fulfillment_mode, payment_status")
    .lte("estimated_ready_at", nowIso)
    .is("ready_notified_at", null);

  const eligible = ((dueOrders ?? []) as DueOrderRow[]).filter((o) => {
    if (o.status === "servie" || o.status === "annulee") return false;
    const isAwaitingPayment = Boolean(o.fulfillment_mode) && o.fulfillment_mode !== "sur_place" && o.payment_status !== "paye";
    return !isAwaitingPayment;
  });

  if (eligible.length === 0) return NextResponse.json({ ranAt: nowIso, notified: 0 });

  const restaurantIds = [...new Set(eligible.map((o) => o.restaurant_id))];
  const customerIds = eligible.map((o) => o.customer_id).filter((id): id is string => Boolean(id));

  const [{ data: restaurantRows }, { data: customerRows }] = await Promise.all([
    admin.from("restaurants").select("id, name, google_maps_url, address, city").in("id", restaurantIds),
    customerIds.length
      ? admin.from("customers").select("id, email, user_id, phone, name").in("id", customerIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const restaurantById = new Map(
    ((restaurantRows ?? []) as { id: string; name: string; google_maps_url: string | null; address: string; city: string }[]).map(
      (r) => [r.id, r]
    )
  );
  const customerById = new Map(
    ((customerRows ?? []) as { id: string; email: string | null; user_id: string | null; phone: string | null; name: string }[]).map(
      (c) => [c.id, c]
    )
  );

  let notified = 0;
  await Promise.all(
    eligible.map(async (order) => {
      const restaurant = restaurantById.get(order.restaurant_id);
      if (!restaurant) return;
      const customerRow = order.customer_id ? customerById.get(order.customer_id) : undefined;
      const contact = customerRow
        ? { email: customerRow.email, userId: customerRow.user_id, phone: customerRow.phone, name: customerRow.name }
        : { email: null, userId: null, phone: order.guest_phone, name: order.guest_name };

      const channel = await sendOrderReadyNotification(
        admin,
        { id: restaurant.id, name: restaurant.name, googleMapsUrl: restaurant.google_maps_url, address: restaurant.address, city: restaurant.city },
        contact
      );
      if (channel) {
        await markOrderReadyNotified(admin, order.restaurant_id, order.id);
        notified++;
      }
    })
  );

  return NextResponse.json({ ranAt: nowIso, notified });
}

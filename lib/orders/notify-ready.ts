import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { markOrderReadyNotified, sendOrderReadyNotification } from "@/lib/orders/ready-notification";

/**
 * Loads the order and its linked customer with the service role only after
 * the caller's restaurant membership has been checked by its entry point.
 * Both the web Server Action and native Bearer-token route share this
 * implementation so the delivery contract cannot drift between clients.
 */
export async function notifyOrderReadyById(
  admin: SupabaseClient,
  restaurantId: string,
  orderId: string
): Promise<{ channels: Array<"email" | "push"> }> {
  const [{ data: restaurantRow }, { data: orderRow }] = await Promise.all([
    admin
      .from("restaurants")
      .select("id, name, google_maps_url, address, city")
      .eq("id", restaurantId)
      .maybeSingle(),
    admin
      .from("orders")
      .select("guest_name, guest_phone, customer_id")
      .eq("restaurant_id", restaurantId)
      .eq("id", orderId)
      .maybeSingle(),
  ]);
  if (!restaurantRow || !orderRow) return { channels: [] };

  const order = orderRow as { guest_name: string; guest_phone: string | null; customer_id: string | null };
  let customer: { email: string | null; userId: string | null; phone: string | null; name: string } = {
    email: null,
    userId: null,
    phone: order.guest_phone,
    name: order.guest_name,
  };
  if (order.customer_id) {
    const { data: customerRow } = await admin
      .from("customers")
      .select("email, user_id, phone, name")
      .eq("id", order.customer_id)
      .maybeSingle();
    if (customerRow) {
      const row = customerRow as { email: string | null; user_id: string | null; phone: string | null; name: string };
      customer = { email: row.email, userId: row.user_id, phone: row.phone ?? order.guest_phone, name: row.name };
    }
  }

  const restaurant = restaurantRow as {
    id: string;
    name: string;
    google_maps_url: string | null;
    address: string;
    city: string;
  };
  const channels = await sendOrderReadyNotification(
    admin,
    { id: restaurant.id, name: restaurant.name, googleMapsUrl: restaurant.google_maps_url, address: restaurant.address, city: restaurant.city },
    customer
  );
  if (channels.length > 0) await markOrderReadyNotified(admin, restaurantId, orderId);
  return { channels };
}

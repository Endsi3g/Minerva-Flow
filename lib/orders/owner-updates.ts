import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send";
import { parseCustomerLanguage, type CustomerLanguage } from "@/lib/i18n/customer-language";

export type OrderUpdateChannels = Array<"push">;

type OrderContext = {
  restaurantName: string;
  timezone: string;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  customerUserId: string | null;
  customerId: string | null;
  language: CustomerLanguage;
};

/** Loads who to tell about an order, with the service role, after the caller's membership check. */
async function loadOrderContext(restaurantId: string, orderId: string): Promise<OrderContext | null> {
  const admin = createAdminClient();
  const [{ data: order }, { data: restaurant }] = await Promise.all([
    admin.from("orders").select("id, customer_id").eq("restaurant_id", restaurantId).eq("id", orderId).maybeSingle(),
    admin.from("restaurants").select("name, timezone, google_place_id, google_maps_url").eq("id", restaurantId).maybeSingle(),
  ]);
  if (!order || !restaurant) return null;
  let userId: string | null = null;
  let language: CustomerLanguage = "fr";
  if (order.customer_id) {
    const { data: customer } = await admin.from("customers").select("user_id, preferred_language").eq("id", order.customer_id).maybeSingle();
    userId = customer?.user_id ?? null;
    language = parseCustomerLanguage(customer?.preferred_language);
  }
  return {
    restaurantName: restaurant.name,
    timezone: restaurant.timezone || "America/Toronto",
    googlePlaceId: restaurant.google_place_id ?? null,
    googleMapsUrl: restaurant.google_maps_url ?? null,
    customerUserId: userId,
    customerId: order.customer_id ?? null,
    language,
  };
}

/** Saves the owner's note on the order (the customer app shows it) and pushes it. */
export async function sendOrderOwnerMessage(restaurantId: string, orderId: string, message: string): Promise<OrderUpdateChannels | null> {
  const text = message.trim().slice(0, 240);
  if (!text) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("orders")
    .update({ owner_message: text, owner_message_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId).eq("id", orderId).select("id").maybeSingle();
  if (error || !data) return null;
  const context = await loadOrderContext(restaurantId, orderId);
  if (!context?.customerUserId) return [];
  const reached = await sendPushToUsers([context.customerUserId], { title: context.restaurantName, body: text, link: "/portal" }, restaurantId);
  return reached > 0 ? ["push"] : [];
}

/** Tells the customer the new estimated ready time (e.g. "Ready around 12:45"). */
export async function notifyOrderEtaChanged(restaurantId: string, orderId: string, estimatedReadyAt: Date): Promise<OrderUpdateChannels> {
  const context = await loadOrderContext(restaurantId, orderId);
  if (!context?.customerUserId) return [];
  const en = context.language === "en";
  const time = new Intl.DateTimeFormat(en ? "en-CA" : "fr-CA", { hour: "numeric", minute: "2-digit", timeZone: context.timezone }).format(estimatedReadyAt);
  const reached = await sendPushToUsers([context.customerUserId], {
    title: en ? `Your order will be ready around ${time}` : `Votre commande sera prête vers ${time}`,
    body: en ? `Update from ${context.restaurantName}.` : `Mise à jour de ${context.restaurantName}.`,
    link: "/portal",
  }, restaurantId);
  return reached > 0 ? ["push"] : [];
}

export function googleReviewUrl(context: Pick<OrderContext, "googlePlaceId" | "googleMapsUrl">): string | null {
  if (context.googlePlaceId) return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(context.googlePlaceId)}`;
  return context.googleMapsUrl;
}

/**
 * One Google review request per order, only when the restaurant configured
 * its Google listing, and never more than one per customer per 7 days.
 * Returns true when the order was handled (sent or deliberately skipped) so
 * the cron does not look at it again.
 */
export async function sendReviewRequest(restaurantId: string, orderId: string): Promise<boolean> {
  const admin = createAdminClient();
  const context = await loadOrderContext(restaurantId, orderId);
  const url = context ? googleReviewUrl(context) : null;
  const handled = async () => {
    await admin.from("orders").update({ review_requested_at: new Date().toISOString() }).eq("restaurant_id", restaurantId).eq("id", orderId);
    return true;
  };
  if (!context || !context.customerUserId || !context.customerId || !url) return handled();

  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true })
    .eq("customer_id", context.customerId).gte("review_requested_at", since);
  if ((count ?? 0) > 0) return handled();

  const en = context.language === "en";
  await sendPushToUsers([context.customerUserId], {
    title: en ? `How was your meal at ${context.restaurantName}?` : `Comment était votre repas chez ${context.restaurantName} ?`,
    body: en ? "A Google review takes 30 seconds and really helps the restaurant." : "Un avis Google prend 30 secondes et aide beaucoup le restaurant.",
    link: url,
  }, restaurantId);
  return handled();
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { sendApnsToTokens, isAPNsConfigured } from "@/lib/push/apns";

/** Prefers the owner-set Maps link (Restaurant.googleMapsUrl) — falls back to a search query built from address/city. */
function mapsUrl(restaurant: { googleMapsUrl: string | null; address: string; city: string }): string {
  if (restaurant.googleMapsUrl) return restaurant.googleMapsUrl;
  const query = encodeURIComponent(`${restaurant.address}, ${restaurant.city}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * "Commande prête" — triggered manually by staff from /commandes (see
 * notifyOrderReadyAction). Unlike lib/retention/send.ts this is
 * transactional (a direct consequence of an order the customer placed),
 * not marketing, so it does NOT check marketing_consent. Same
 * Email, web push and native APNs are independent channels, deliberately
 * sent together rather than as a first-successful fallback. SMS is not part
 * of Minerva Flow's customer-notification channel.
 */
export async function sendOrderReadyNotification(
  admin: SupabaseClient,
  restaurant: { id: string; name: string; googleMapsUrl: string | null; address: string; city: string },
  customer: { email: string | null; userId: string | null; phone: string | null; name: string }
): Promise<Array<"email" | "push">> {
  const link = mapsUrl(restaurant);
  const firstName = customer.name.trim().split(/\s+/)[0] || customer.name;
  const p = (text: string) => `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">${text}</p>`;

  const deliveries: Array<"email" | "push"> = [];

  const emailDelivery = customer.email
    ? sendTransactionalEmail({
      to: customer.email,
      subject: `Votre commande est prête chez ${restaurant.name}`,
      bodyHtml:
        p(`Bonjour ${firstName},`) +
        p(`Votre commande chez ${restaurant.name} est prête — passez la récupérer quand vous voulez.`),
      ctaLabel: "Itinéraire",
      ctaUrl: link,
    })
    : null;

  if (customer.userId) {
    const payload = { title: "Votre commande est prête !", body: `${restaurant.name} vous attend pour la cueillette.`, link };
    await sendPushToUsers([customer.userId], payload, restaurant.id);
    if (isAPNsConfigured()) {
      const { data: tokenRows } = await admin
        .from("device_push_tokens")
        .select("token")
        .eq("platform", "ios")
        .eq("user_id", customer.userId);
      const tokens = ((tokenRows ?? []) as { token: string }[]).map((r) => r.token);
      if (tokens.length > 0) {
        await sendApnsToTokens(tokens, payload);
      }
    }
    deliveries.push("push");
  }

  if (emailDelivery) {
    const result = await emailDelivery;
    if (result.ok) deliveries.push("email");
  }
  return deliveries;
}

/** Marks an order as notified so /commandes can show "Renvoyer" instead of "Notifier" after the first send. */
export async function markOrderReadyNotified(
  admin: SupabaseClient,
  restaurantId: string,
  orderId: string
): Promise<void> {
  await admin
    .from("orders")
    .update({ ready_notified_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId);
}

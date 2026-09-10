import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { sendSms, isSmsConfigured } from "@/lib/sms/send";

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
 * email → push → SMS fallback contract otherwise.
 */
export async function sendOrderReadyNotification(
  restaurant: { id: string; name: string; googleMapsUrl: string | null; address: string; city: string },
  customer: { email: string | null; userId: string | null; phone: string | null; name: string }
): Promise<"email" | "push" | "sms" | null> {
  const link = mapsUrl(restaurant);
  const firstName = customer.name.trim().split(/\s+/)[0] || customer.name;
  const p = (text: string) => `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">${text}</p>`;

  if (customer.email) {
    const result = await sendTransactionalEmail({
      to: customer.email,
      subject: `Votre commande est prête chez ${restaurant.name}`,
      bodyHtml:
        p(`Bonjour ${firstName},`) +
        p(`Votre commande chez ${restaurant.name} est prête — passez la récupérer quand vous voulez.`),
      ctaLabel: "Itinéraire",
      ctaUrl: link,
    });
    if (result.ok) return "email";
  }
  if (customer.userId) {
    await sendPushToUsers(
      [customer.userId],
      { title: "Votre commande est prête !", body: `${restaurant.name} vous attend pour la cueillette.`, link },
      restaurant.id
    );
    return "push";
  }
  if (isSmsConfigured() && customer.phone) {
    const ok = await sendSms(customer.phone, `${restaurant.name} : ${firstName}, votre commande est prête ! ${link}`);
    if (ok) return "sms";
  }
  return null;
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

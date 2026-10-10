import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { parseCustomerLanguage, type CustomerLanguage } from "@/lib/i18n/customer-language";
import type { OrderStatus } from "@/lib/types";

const COPY: Record<OrderStatus, { title: string; body: string }> = {
  soumise: { title: "Commande reçue", body: "Hey ! Le restaurant regarde votre commande et vous confirme bientôt la suite." },
  confirmee: { title: "C’est confirmé !", body: "Votre repas sera bientôt prêt. Vous paierez sur place à l’heure prévue." },
  en_preparation: { title: "Votre repas se prépare", body: "L’équipe cuisine votre commande et vous préviendra dès qu’elle sera prête." },
  prete: { title: "Bonne nouvelle, c’est prêt !", body: "Votre repas vous attend au restaurant à l’heure prévue." },
  servie: { title: "Bon appétit !", body: "Merci d’avoir choisi ce restaurant. Au plaisir de vous revoir !" },
  annulee: { title: "Commande annulée sans frais", body: "Petit imprévu : le restaurant ne pourra pas préparer cette commande. Aucun paiement ne vous sera demandé." },
};

const COPY_EN: Record<OrderStatus, { title: string; body: string }> = {
  soumise: { title: "Order received", body: "Hey! The restaurant is looking at your order and will confirm the next step shortly." },
  confirmee: { title: "It's confirmed!", body: "Your meal will be ready soon. You will pay on site at the planned time." },
  en_preparation: { title: "Your meal is being prepared", body: "The team is cooking your order and will let you know as soon as it is ready." },
  prete: { title: "Good news, it's ready!", body: "Your meal is waiting for you at the restaurant at the planned time." },
  servie: { title: "Enjoy your meal!", body: "Thank you for choosing this restaurant. See you again soon!" },
  annulee: { title: "Order cancelled at no charge", body: "A small hiccup: the restaurant will not be able to prepare this order. You will not be asked to pay." },
};

export type OrderNotifyChannels = Array<"email" | "push">;

export async function notifyOrderStatusCustomer(restaurantId: string, orderId: string, status: OrderStatus, cancellationReason?: string): Promise<OrderNotifyChannels> {
  const admin = createAdminClient();
  const [{ data: order }, { data: restaurant }] = await Promise.all([
    admin.from("orders").select("id, customer_id, total, status_changed_at").eq("restaurant_id", restaurantId).eq("id", orderId).maybeSingle(),
    admin.from("restaurants").select("name").eq("id", restaurantId).maybeSingle(),
  ]);
  if (!order || !restaurant) return [];
  let customer: { email: string | null; userId: string | null; language: CustomerLanguage } = { email: null, userId: null, language: "fr" };
  if (order.customer_id) {
    const { data } = await admin.from("customers").select("email, user_id, preferred_language").eq("id", order.customer_id).maybeSingle();
    if (data) customer = { email: data.email, userId: data.user_id, language: parseCustomerLanguage(data.preferred_language) };
  }
  const en = customer.language === "en";
  const base = (en ? COPY_EN : COPY)[status];
  const message = status === "annulee" && cancellationReason
    ? { ...base, body: en ? base.body.replace(" You will not", ` ${cancellationReason}. You will not`) : base.body.replace(" Aucun paiement", ` ${cancellationReason}. Aucun paiement`) }
    : base;
  const channels: OrderNotifyChannels = [];
  if (customer.email) {
    const emailResult = await sendOrderStatusEmail({ to: customer.email, restaurantName: restaurant.name, orderId, status, total: Number(order.total), cancellationReason, language: customer.language }).catch(() => ({ ok: false }));
    if (emailResult.ok) channels.push("email");
  }
  if (!customer.userId) return channels;
  const { error } = await admin.from("notifications").insert({
    restaurant_id: restaurantId,
    user_id: customer.userId,
    type: "order_status",
    title: message.title,
    body: message.body,
    link: "/portal",
    dedupe_key: `order:${orderId}:${status}:${order.status_changed_at ?? Date.now()}`,
  });
  if (!error) {
    const reached = await sendPushToUsers([customer.userId], { ...message, link: "/portal" }, restaurantId);
    if (reached > 0) channels.push("push");
  }
  return channels;
}

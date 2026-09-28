import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import type { OrderStatus } from "@/lib/types";

const COPY: Record<OrderStatus, { title: string; body: string }> = {
  soumise: { title: "Commande reçue", body: "Hey ! Le restaurant regarde votre commande et vous confirme bientôt la suite." },
  confirmee: { title: "C’est confirmé !", body: "Votre repas sera bientôt prêt. Vous paierez sur place à l’heure prévue." },
  en_preparation: { title: "Votre repas se prépare", body: "L’équipe cuisine votre commande et vous préviendra dès qu’elle sera prête." },
  prete: { title: "Bonne nouvelle, c’est prêt !", body: "Votre repas vous attend au restaurant à l’heure prévue." },
  servie: { title: "Bon appétit !", body: "Merci d’avoir choisi ce restaurant. Au plaisir de vous revoir !" },
  annulee: { title: "Commande annulée sans frais", body: "Petit imprévu : le restaurant ne pourra pas préparer cette commande. Aucun paiement ne vous sera demandé." },
};

export async function notifyOrderStatusCustomer(restaurantId: string, orderId: string, status: OrderStatus, cancellationReason?: string) {
  const admin = createAdminClient();
  const [{ data: order }, { data: restaurant }] = await Promise.all([
    admin.from("orders").select("id, customer_id, total, status_changed_at").eq("restaurant_id", restaurantId).eq("id", orderId).maybeSingle(),
    admin.from("restaurants").select("name").eq("id", restaurantId).maybeSingle(),
  ]);
  if (!order || !restaurant) return;
  let customer: { email: string | null; userId: string | null } = { email: null, userId: null };
  if (order.customer_id) {
    const { data } = await admin.from("customers").select("email, user_id").eq("id", order.customer_id).maybeSingle();
    if (data) customer = { email: data.email, userId: data.user_id };
  }
  const base = COPY[status];
  const message = status === "annulee" && cancellationReason
    ? { ...base, body: `${base.body.replace(" Aucun paiement", ` ${cancellationReason}. Aucun paiement`)}` }
    : base;
  if (customer.email) {
    await sendOrderStatusEmail({ to: customer.email, restaurantName: restaurant.name, orderId, status, total: Number(order.total), cancellationReason }).catch(() => ({ ok: false }));
  }
  if (!customer.userId) return;
  const { error } = await admin.from("notifications").insert({
    restaurant_id: restaurantId,
    user_id: customer.userId,
    type: "order_status",
    title: message.title,
    body: message.body,
    link: "/portal",
    dedupe_key: `order:${orderId}:${status}:${order.status_changed_at ?? Date.now()}`,
  });
  if (!error) await sendPushToUsers([customer.userId], { ...message, link: "/portal" }, restaurantId);
}

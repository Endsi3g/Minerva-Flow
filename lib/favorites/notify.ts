import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push/send";

/**
 * "C'est de retour !" — alerts customers who favorited a menu item or
 * offer when it flips from unavailable (active: false) to available again
 * (see updateMenuItem/updateOffer for the transition check). Push-only and
 * deliberately not gated on marketing_consent: favoriting IS the
 * customer's explicit opt-in for this specific alert — same reasoning as
 * the "commande prête" notification being transactional rather than
 * marketing (see lib/orders/ready-notification.ts).
 */
export async function notifyFavoritedItemAvailable(
  supabase: SupabaseClient,
  restaurantId: string,
  kind: "menu_item" | "offer",
  itemId: string,
  itemName: string
): Promise<void> {
  const column = kind === "menu_item" ? "favorite_menu_item_ids" : "favorite_offer_ids";
  const { data: customerRows } = await supabase
    .from("customers")
    .select("user_id")
    .eq("restaurant_id", restaurantId)
    .contains(column, [itemId]);

  const userIds = ((customerRows ?? []) as { user_id: string | null }[])
    .map((c) => c.user_id)
    .filter((id): id is string => Boolean(id));
  if (userIds.length === 0) return;

  await sendPushToUsers(
    userIds,
    { title: "C'est de retour !", body: `« ${itemName} » est de nouveau disponible.`, link: "/portal" },
    restaurantId
  );
}

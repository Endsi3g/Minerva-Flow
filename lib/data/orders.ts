import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { recordSale } from "@/lib/data/menu";
import { getRecipeItemsForMenuItems } from "@/lib/data/recipes";
import { logMovement } from "@/lib/data/inventory";
import type { Order, OrderItem, OrderStatus, OrderPaymentStatus } from "@/lib/types";

type OrderRow = {
  id: string;
  restaurant_id: string;
  status: OrderStatus;
  guest_name: string;
  guest_phone: string | null;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  total: number;
  payment_method: string | null;
  payment_status: OrderPaymentStatus;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  notes: string | null;
  customer_id: string | null;
  referral_link_id: string | null;
  is_public_request: boolean;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
};

function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    menuItemId: row.menu_item_id,
    itemName: row.item_name,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    notes: row.notes,
  };
}

function mapOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    status: row.status,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    subtotal: row.subtotal,
    taxAmount: row.tax_amount,
    tipAmount: row.tip_amount,
    total: row.total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    paidAt: row.paid_at,
    notes: row.notes,
    customerId: row.customer_id,
    referralLinkId: row.referral_link_id,
    isPublicRequest: row.is_public_request,
    createdAt: row.created_at,
    items: items.filter((i) => i.order_id === row.id).map(mapOrderItem),
  };
}

export async function getOrdersForDay(restaurantId: string, dayStart: string, dayEnd: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", dayStart)
    .lt("created_at", dayEnd)
    .order("created_at", { ascending: false });

  if (error || !orders) return [];
  const orderRows = orders as OrderRow[];
  if (orderRows.length === 0) return [];

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in(
      "order_id",
      orderRows.map((o) => o.id)
    );

  const itemRows = (items as OrderItemRow[]) ?? [];
  return orderRows.map((row) => mapOrder(row, itemRows));
}

export async function updateOrderStatus(restaurantId: string, id: string, status: OrderStatus): Promise<boolean> {
  const supabase = await createClient();

  // Read the current status first so marking an order "servie" twice (e.g. a
  // double click, or toggling status back and forth) can't double-count its
  // revenue/popularity effects below.
  const { data: current } = await supabase
    .from("orders")
    .select("status")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();
  const wasAlreadyServed = (current as { status: OrderStatus } | null)?.status === "servie";

  const { error } = await supabase.from("orders").update({ status }).eq("restaurant_id", restaurantId).eq("id", id);

  if (!error) {
    await logActivity({
      restaurantId,
      actionType: "order.status_change",
      entityType: "order",
      entityId: id,
      description: `A changé le statut d'une commande (${status})`,
    });

    if (status === "servie" && !wasAlreadyServed) {
      await applyServedOrderEffects(restaurantId, id);
    }
  }

  return !error;
}

/**
 * The core "order = inventory -1, revenue +X, automatically" promise: once
 * staff marks an order "servie", its sale is reflected on the day's revenue
 * (so Overview/Finance see it without anyone touching /days), each ordered
 * item's popularity counter is bumped (so menu engineering's cheval de
 * bataille/poids mort classification stays live), and — for any menu item
 * that has a "recette" defined (recipe_items, set from the menu item editor)
 * — the inventory items it consumes are decremented too. A dish with no
 * recipe defined simply doesn't move inventory, so this is additive and
 * never blocks serving an order. Best-effort — a failure here shouldn't
 * roll back the status change staff just made.
 */
async function applyServedOrderEffects(restaurantId: string, orderId: string): Promise<void> {
  const supabase = await createClient();

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("subtotal, created_at").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("menu_item_id, item_name, quantity").eq("order_id", orderId),
  ]);

  if (order) {
    const { subtotal, created_at } = order as { subtotal: number; created_at: string };
    const date = created_at.slice(0, 10);
    await incrementServiceDayRevenue(restaurantId, date, subtotal);
  }

  const orderItems =
    (items as { menu_item_id: string | null; item_name: string; quantity: number }[] | null) ?? [];

  for (const item of orderItems) {
    if (item.menu_item_id) {
      await recordSale(restaurantId, item.menu_item_id, item.quantity);
    }
  }

  await decrementInventoryForOrderItems(restaurantId, orderId, orderItems);
}

/**
 * Resolves each order line's menu item to its recipe (if any) and logs an
 * "utilisation" movement per consumed inventory item, quantity aggregated
 * across all lines in the order (e.g. two dishes both using Saumon draw
 * down the same inventory item once, not via two racing writes). Reuses
 * logMovement (lib/data/inventory.ts) so this gets the same atomic
 * quantity_on_hand update and activity log entry a manual inventory
 * movement would get.
 */
async function decrementInventoryForOrderItems(
  restaurantId: string,
  orderId: string,
  orderItems: { menu_item_id: string | null; item_name: string; quantity: number }[]
): Promise<void> {
  const menuItemIds = [...new Set(orderItems.map((i) => i.menu_item_id).filter((id): id is string => Boolean(id)))];
  if (menuItemIds.length === 0) return;

  const recipesByMenuItem = await getRecipeItemsForMenuItems(restaurantId, menuItemIds);
  if (recipesByMenuItem.size === 0) return;

  const consumedByInventoryItem = new Map<string, number>();
  for (const item of orderItems) {
    const recipe = item.menu_item_id ? recipesByMenuItem.get(item.menu_item_id) : undefined;
    if (!recipe) continue;
    for (const ingredient of recipe) {
      const total = ingredient.quantityPerUnit * item.quantity;
      consumedByInventoryItem.set(
        ingredient.inventoryItemId,
        (consumedByInventoryItem.get(ingredient.inventoryItemId) ?? 0) + total
      );
    }
  }

  const shortOrderId = orderId.slice(0, 8);
  for (const [inventoryItemId, quantity] of consumedByInventoryItem) {
    if (quantity <= 0) continue;
    await logMovement(restaurantId, inventoryItemId, "utilisation", quantity, `Commande #${shortOrderId} servie`);
  }
}

/**
 * Adds `amount` to service_days.revenue for `date` (creating the row if the
 * day hasn't been touched yet). Atomic increment via RPC (see migration) —
 * two orders served concurrently on the same day must not lose one write to
 * a read-then-write race, the same reasoning as increment_inventory_quantity.
 */
async function incrementServiceDayRevenue(restaurantId: string, date: string, amount: number): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_service_day_revenue", {
    p_restaurant_id: restaurantId,
    p_date: date,
    p_amount: amount,
  });
}

export async function deleteOrder(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("restaurant_id", restaurantId).eq("id", id);
  return !error;
}

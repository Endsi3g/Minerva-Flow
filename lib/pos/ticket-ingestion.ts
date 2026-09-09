import { createAdminClient } from "@/lib/supabase/admin";
import type { PosProvider } from "@/lib/data/pos-connections";
import { resolvePosItemMapping } from "./item-mapping";
import { recordSale } from "@/lib/data/menu";
import { decrementInventoryForOrderItems } from "@/lib/data/orders";
import { upsertSyncedServiceDayRevenue } from "@/lib/data/service-days";

export type PosTicketLineItem = {
  externalItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type PosTicket = {
  externalOrderId: string;
  closedAt: string; // ISO 8601 string
  subtotal: number;
  taxAmount?: number;
  tipAmount?: number;
  total: number;
  guestName?: string;
  lineItems: PosTicketLineItem[];
};

export type IngestionResult = {
  ingestedCount: number;
  skippedDuplicateCount: number;
  totalRevenue: number;
  itemsProcessed: number;
};

/**
 * Idempotently ingests tickets from a POS provider, mapping line items to menu items,
 * registering completed orders, bumping dish popularity, and drawing down ingredient inventory.
 */
export async function ingestPosTickets(
  restaurantId: string,
  provider: PosProvider,
  tickets: PosTicket[]
): Promise<IngestionResult> {
  const admin = createAdminClient();
  let ingestedCount = 0;
  let skippedDuplicateCount = 0;
  let totalRevenue = 0;
  let itemsProcessed = 0;

  if (tickets.length === 0) {
    return { ingestedCount: 0, skippedDuplicateCount: 0, totalRevenue: 0, itemsProcessed: 0 };
  }

  // Pre-load all menu items for the restaurant to speed up fuzzy matching
  const { data: menuData } = await admin
    .from("menu_items")
    .select("id, name")
    .eq("restaurant_id", restaurantId);
  const cachedMenuItems = (menuData ?? []) as { id: string; name: string }[];

  const dailyRevenueMap = new Map<string, number>();

  for (const ticket of tickets) {
    // 1. Idempotency check: Skip ticket if already ingested
    const { data: existingOrder } = await admin
      .from("orders")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("pos_provider", provider)
      .eq("external_order_id", ticket.externalOrderId)
      .maybeSingle();

    if (existingOrder) {
      skippedDuplicateCount++;
      continue;
    }

    const date = ticket.closedAt.slice(0, 10);
    dailyRevenueMap.set(date, (dailyRevenueMap.get(date) ?? 0) + ticket.subtotal);

    // 2. Insert into orders table as an archived served order
    const { data: newOrder, error: orderError } = await admin
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        status: "servie",
        guest_name: ticket.guestName || `Client ${provider.toUpperCase()}`,
        subtotal: ticket.subtotal,
        tax_amount: ticket.taxAmount ?? 0,
        tip_amount: ticket.tipAmount ?? 0,
        total: ticket.total,
        payment_method: provider,
        pos_provider: provider,
        external_order_id: ticket.externalOrderId,
        created_at: ticket.closedAt,
      })
      .select("id")
      .single();

    if (orderError || !newOrder) {
      console.error(`Failed to insert POS order ${ticket.externalOrderId}:`, orderError);
      continue;
    }

    ingestedCount++;
    totalRevenue += ticket.total;

    // 3. Resolve each line item and insert into order_items
    const resolvedOrderItems: { menu_item_id: string | null; item_name: string; quantity: number }[] = [];

    for (const item of ticket.lineItems) {
      const menuItemId = await resolvePosItemMapping(
        restaurantId,
        provider,
        item.externalItemId,
        item.name,
        cachedMenuItems
      );

      await admin.from("order_items").insert({
        order_id: newOrder.id,
        menu_item_id: menuItemId,
        item_name: item.name,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        notes: item.notes ?? null,
      });

      resolvedOrderItems.push({
        menu_item_id: menuItemId,
        item_name: item.name,
        quantity: item.quantity,
      });

      itemsProcessed += item.quantity;

      // 4. Update dish popularity for Menu Engineering (units_sold)
      if (menuItemId) {
        try {
          await recordSale(restaurantId, menuItemId, item.quantity);
        } catch (err) {
          console.warn(`Could not record sale for menu item ${menuItemId}:`, err);
        }
      }
    }

    // 5. Decrement inventory based on recipes (if recipe_items are defined)
    try {
      await decrementInventoryForOrderItems(restaurantId, newOrder.id, resolvedOrderItems);
    } catch (err) {
      console.warn(`Could not decrement inventory for order ${newOrder.id}:`, err);
    }
  }

  // 6. Synchronize aggregated service_days revenue for each affected date
  for (const [date, revenue] of dailyRevenueMap) {
    if (revenue > 0) {
      await upsertSyncedServiceDayRevenue(restaurantId, date, revenue, provider);
    }
  }

  return {
    ingestedCount,
    skippedDuplicateCount,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    itemsProcessed,
  };
}

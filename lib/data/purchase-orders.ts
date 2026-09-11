import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "@/lib/types";

type PurchaseOrderRow = {
  id: string;
  restaurant_id: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  created_at: string;
};

type PurchaseOrderItemRow = {
  id: string;
  purchase_order_id: string;
  inventory_item_id?: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  received_quantity?: number | null;
};

function mapItem(row: PurchaseOrderItemRow): PurchaseOrderItem {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    inventoryItemId: row.inventory_item_id ?? null,
    itemName: row.item_name,
    quantity: row.quantity,
    unit: row.unit,
    unitCost: row.unit_cost,
    receivedQuantity: row.received_quantity ?? null,
  };
}

function mapOrder(row: PurchaseOrderRow, items: PurchaseOrderItemRow[]): PurchaseOrder {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    supplierId: row.supplier_id,
    status: row.status,
    orderDate: row.order_date,
    expectedDate: row.expected_date,
    notes: row.notes,
    createdAt: row.created_at,
    items: items.filter((i) => i.purchase_order_id === row.id).map(mapItem),
  };
}

export async function getPurchaseOrders(restaurantId: string, client?: SupabaseClient): Promise<PurchaseOrder[]> {
  const supabase = client ?? (await createClient());
  const { data: orders, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("order_date", { ascending: false });

  if (error || !orders) return [];
  const orderRows = orders as PurchaseOrderRow[];
  if (orderRows.length === 0) return [];

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .in("purchase_order_id", orderRows.map((o) => o.id));

  const itemRows = (items as PurchaseOrderItemRow[]) ?? [];
  return orderRows.map((row) => mapOrder(row, itemRows));
}

export async function getPurchaseOrder(restaurantId: string, id: string): Promise<PurchaseOrder | null> {
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !order) return null;
  const orderRow = order as PurchaseOrderRow;

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id);

  return mapOrder(orderRow, (items as PurchaseOrderItemRow[]) ?? []);
}

export type PurchaseOrderItemInput = {
  inventoryItemId?: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  receivedQuantity?: number | null;
};

export type PurchaseOrderInput = {
  supplierId: string;
  expectedDate: string | null;
  notes: string | null;
  items: PurchaseOrderItemInput[];
};

export async function createPurchaseOrder(
  restaurantId: string,
  input: PurchaseOrderInput
): Promise<PurchaseOrder | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .insert({
      restaurant_id: restaurantId,
      supplier_id: input.supplierId,
      expected_date: input.expectedDate || null,
      notes: input.notes,
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error || !order) return null;

  const orderRow = order as PurchaseOrderRow;
  let itemRows: PurchaseOrderItemRow[] = [];

  if (input.items.length > 0) {
    const { data: insertedItems } = await supabase
      .from("purchase_order_items")
      .insert(
        input.items.map((item) => ({
          purchase_order_id: orderRow.id,
          inventory_item_id: item.inventoryItemId || null,
          item_name: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unitCost,
          received_quantity: item.receivedQuantity ?? null,
        }))
      )
      .select("*");
    itemRows = (insertedItems as PurchaseOrderItemRow[]) ?? [];
  }

  await logActivity({
    restaurantId,
    actionType: "purchase_order.create",
    description: `A créé une commande fournisseur (${input.items.length} article(s))`,
  });

  return mapOrder(orderRow, itemRows);
}

export type UpdatePurchaseOrderStatusOutcome = {
  ok: boolean;
  /** True only for the request that actually flipped the status — a duplicate/concurrent
   * request racing to also set "recue" gets ok:true but transitioned:false, so the caller
   * knows not to re-run stock receipt and double-count the delivery. */
  transitioned: boolean;
};

export async function updatePurchaseOrderStatus(
  restaurantId: string,
  id: string,
  status: PurchaseOrderStatus
): Promise<UpdatePurchaseOrderStatusOutcome> {
  const supabase = await createClient();

  if (status === "recue") {
    const { data, error } = await supabase
      .from("purchase_orders")
      .update({ status })
      .eq("restaurant_id", restaurantId)
      .eq("id", id)
      .eq("status", "envoyee")
      .select("id");
    if (error) return { ok: false, transitioned: false };
    return { ok: true, transitioned: (data?.length ?? 0) > 0 };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status })
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return { ok: !error, transitioned: !error };
}

export async function deletePurchaseOrder(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export async function recordPurchaseOrderItemReceipts(
  orderId: string,
  receipts: { itemId: string; receivedQuantity: number }[]
): Promise<boolean> {
  if (receipts.length === 0) return true;
  const supabase = await createClient();

  for (const r of receipts) {
    await supabase
      .from("purchase_order_items")
      .update({ received_quantity: r.receivedQuantity })
      .eq("purchase_order_id", orderId)
      .eq("id", r.itemId);
  }
  return true;
}

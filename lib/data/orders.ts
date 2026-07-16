import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

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

export async function getOrder(restaurantId: string, id: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data: orderRow, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !orderRow) return null;

  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
  return mapOrder(orderRow as OrderRow, (items as OrderItemRow[]) ?? []);
}

export async function updateOrderStatus(restaurantId: string, id: string, status: OrderStatus): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("restaurant_id", restaurantId).eq("id", id);

  if (!error) {
    await logActivity({
      restaurantId,
      actionType: "order.status_change",
      entityType: "order",
      entityId: id,
      description: `A changé le statut d'une commande (${status})`,
    });
  }

  return !error;
}

export async function deleteOrder(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("restaurant_id", restaurantId).eq("id", id);
  return !error;
}

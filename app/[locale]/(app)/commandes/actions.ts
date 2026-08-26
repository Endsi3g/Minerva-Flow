"use server";

import { revalidatePath } from "next/cache";
import { getOrdersForDay, updateOrderStatus, deleteOrder, createOrder, type CreateOrderInput } from "@/lib/data/orders";
import { creditReferralConversionForOrder } from "@/lib/data/customer-referrals";
import type { Order, OrderStatus } from "@/lib/types";

export async function createOrderAction(restaurantId: string, input: CreateOrderInput): Promise<Order | null> {
  if (!restaurantId) return null;
  const order = await createOrder(restaurantId, input);
  if (order) revalidatePath("/commandes");
  return order;
}

export async function getOrdersForDayAction(
  restaurantId: string,
  dayStart: string,
  dayEnd: string
): Promise<Order[]> {
  if (!restaurantId) return [];
  return getOrdersForDay(restaurantId, dayStart, dayEnd);
}

export async function updateOrderStatusAction(
  restaurantId: string,
  id: string,
  status: OrderStatus
): Promise<boolean> {
  const ok = await updateOrderStatus(restaurantId, id, status);
  if (ok) {
    revalidatePath("/commandes");
    if (status === "servie") {
      await creditReferralConversionForOrder(id);
      revalidatePath("/fidelisation");
    }
  }
  return ok;
}

export async function deleteOrderAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteOrder(restaurantId, id);
  if (ok) revalidatePath("/commandes");
  return ok;
}

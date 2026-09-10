"use server";

import { revalidatePath } from "next/cache";
import {
  getOrdersForDay,
  updateOrderStatus,
  deleteOrder,
  createOrder,
  updateOrderEstimatedReadyAt,
  type CreateOrderInput,
} from "@/lib/data/orders";
import { creditReferralConversionForOrder } from "@/lib/data/customer-referrals";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderReadyNotification, markOrderReadyNotified } from "@/lib/orders/ready-notification";
import { setBusyModeManual } from "@/lib/data/restaurants";
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

/**
 * "Notifier le client" on /commandes — manual, staff-triggered (not fired
 * automatically on the confirmee -> prete transition). Transactional, so
 * unlike lib/retention/send.ts it never checks marketing_consent.
 */
export async function notifyOrderReadyAction(
  restaurantId: string,
  orderId: string
): Promise<{ ok: boolean; channel: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId) return { ok: false, channel: null };

  const admin = createAdminClient();

  const [{ data: restaurantRow }, { data: orderRow }] = await Promise.all([
    admin
      .from("restaurants")
      .select("id, name, google_maps_url, address, city")
      .eq("id", restaurantId)
      .maybeSingle(),
    admin
      .from("orders")
      .select("guest_name, guest_phone, customer_id")
      .eq("restaurant_id", restaurantId)
      .eq("id", orderId)
      .maybeSingle(),
  ]);
  if (!restaurantRow || !orderRow) return { ok: false, channel: null };
  const order = orderRow as { guest_name: string; guest_phone: string | null; customer_id: string | null };

  let customer: { email: string | null; userId: string | null; phone: string | null; name: string } = {
    email: null,
    userId: null,
    phone: order.guest_phone,
    name: order.guest_name,
  };
  if (order.customer_id) {
    const { data: customerRow } = await admin
      .from("customers")
      .select("email, user_id, phone, name")
      .eq("id", order.customer_id)
      .maybeSingle();
    if (customerRow) {
      const c = customerRow as { email: string | null; user_id: string | null; phone: string | null; name: string };
      customer = { email: c.email, userId: c.user_id, phone: c.phone ?? order.guest_phone, name: c.name };
    }
  }

  const restaurant = restaurantRow as {
    id: string;
    name: string;
    google_maps_url: string | null;
    address: string;
    city: string;
  };
  const channel = await sendOrderReadyNotification(
    admin,
    { id: restaurant.id, name: restaurant.name, googleMapsUrl: restaurant.google_maps_url, address: restaurant.address, city: restaurant.city },
    customer
  );
  if (channel) {
    await markOrderReadyNotified(admin, restaurantId, orderId);
    revalidatePath("/commandes");
  }
  return { ok: Boolean(channel), channel };
}

/** The "On est débordés" quick toggle on /commandes — see setBusyModeManual. */
export async function setBusyModeManualAction(restaurantId: string, busy: boolean): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId) return false;
  const ok = await setBusyModeManual(restaurantId, busy);
  if (ok) revalidatePath("/commandes");
  return ok;
}

/** Staff override for one order's "prêt vers" estimate — see updateOrderEstimatedReadyAt. */
export async function updateOrderEtaAction(
  restaurantId: string,
  orderId: string,
  minutesFromNow: number | null
): Promise<boolean> {
  const ok = await updateOrderEstimatedReadyAt(restaurantId, orderId, minutesFromNow);
  if (ok) revalidatePath("/commandes");
  return ok;
}

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
import { notifyOrderReadyById } from "@/lib/orders/notify-ready";
import { setBusyModeManual } from "@/lib/data/restaurants";
import type { Order, OrderStatus } from "@/lib/types";
import { getServiceQuotesForRestaurant, issueServiceQuote, type ServiceQuoteLineInput } from "@/lib/data/service-quotes";

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

  const { channels } = await notifyOrderReadyById(admin, restaurantId, orderId);
  if (channels.length > 0) {
    revalidatePath("/commandes");
  }
  return { ok: channels.length > 0, channel: channels.join(", ") || null };
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

export async function getServiceQuotesAction(restaurantId: string) {
  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return { ok: false as const, reason: "unavailable" as const };
  }
  return getServiceQuotesForRestaurant(restaurantId);
}

export async function issueServiceQuoteAction(
  restaurantId: string,
  quoteId: string,
  lines: ServiceQuoteLineInput[],
  taxRate: number,
  depositPercent: number,
  ownerNotes: string | null
) {
  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return { ok: false as const, reason: "not_authorized" };
  }
  try {
    const result = await issueServiceQuote(restaurantId, quoteId, lines, taxRate, depositPercent, ownerNotes);
    if (result.ok) revalidatePath("/commandes");
    return result;
  } catch (error) {
    console.error("issueServiceQuoteAction failed:", error);
    return { ok: false as const, reason: "issue_failed" };
  }
}

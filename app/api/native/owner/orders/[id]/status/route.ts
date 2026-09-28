import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrderPaymentUnresolved } from "@/lib/orders/payment-gate";
import { notifyOrderStatusCustomer } from "@/lib/orders/status-notification";
import type { OrderStatus } from "@/lib/types";

const ALLOWED = new Set<OrderStatus>(["soumise", "confirmee", "en_preparation", "prete", "servie", "annulee"]);
const PREP_GATED = new Set<OrderStatus>(["en_preparation", "prete", "servie"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await resolveNativeUserId(request);
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { restaurantId?: string; status?: OrderStatus; cancellationReason?: string } | null;
  if (!body?.restaurantId || !body.status || !ALLOWED.has(body.status)) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  const { data: membership } = await admin.from("restaurant_members").select("role")
    .eq("restaurant_id", body.restaurantId).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!membership || !["owner", "manager", "staff"].includes(membership.role)) return NextResponse.json({ ok: false }, { status: 403 });

  const { data: order } = await admin.from("orders").select("status, payment_status, deposit_paid_amount")
    .eq("restaurant_id", body.restaurantId).eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ ok: false }, { status: 404 });
  if (PREP_GATED.has(body.status) && isOrderPaymentUnresolved(order.payment_status, order.deposit_paid_amount)) {
    return NextResponse.json({ ok: false, reason: "payment_pending" }, { status: 409 });
  }
  const cancellationReason = body.cancellationReason?.trim().slice(0, 500)
    || (body.status === "annulee" ? "Un imprévu empêche le restaurant de préparer cette commande." : null);
  const { error } = await admin.from("orders").update({
    status: body.status,
    ...(body.status === "annulee" ? { cancellation_reason: cancellationReason } : {}),
  }).eq("restaurant_id", body.restaurantId).eq("id", id);
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  await notifyOrderStatusCustomer(body.restaurantId, id, body.status, cancellationReason ?? undefined);
  return NextResponse.json({ ok: true });
}

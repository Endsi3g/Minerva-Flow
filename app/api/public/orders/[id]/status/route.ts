import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`public-order-status:${ip}`, { max: 60, windowSeconds: 300 });
  if (!allowed) return NextResponse.json({ error: "Réessayez dans quelques minutes." }, { status: 429, headers: { "Cache-Control": "no-store" } });

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders")
    .select("id, restaurant_id, customer_id, status, status_changed_at, estimated_ready_at, cancellation_reason, is_public_request")
    .eq("id", id)
    .eq("is_public_request", true)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const { data: restaurant } = await admin.from("restaurants").select("name").eq("id", order.restaurant_id).maybeSingle();
  let welcomeBonusPoints = 0;
  if (order.status === "servie" && order.customer_id) {
    const { data: customer } = await admin.from("customers").select("welcome_bonus_order_id, loyalty_points").eq("id", order.customer_id).maybeSingle();
    if (customer?.welcome_bonus_order_id === order.id) {
      const { data: transaction } = await admin.from("loyalty_transactions").select("points_delta").eq("customer_id", order.customer_id).eq("note", "Bonus de bienvenue — première commande servie").maybeSingle();
      welcomeBonusPoints = Math.max(0, Number(transaction?.points_delta ?? 0));
    }
  }

  return NextResponse.json({
    status: order.status,
    statusChangedAt: order.status_changed_at,
    estimatedReadyAt: order.estimated_ready_at,
    cancellationReason: order.cancellation_reason,
    restaurantName: restaurant?.name ?? "Votre restaurant",
    welcomeBonusPoints,
  }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { resolveNativeRestaurantManager } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";

/** Owner/manager ETA override, shared by the native apps. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => null) as { restaurantId?: unknown; minutesFromNow?: unknown } | null;
  if (typeof body?.restaurantId !== "string" || !body.restaurantId) {
    return NextResponse.json({ ok: false, error: "Restaurant is required" }, { status: 400 });
  }
  const minutes = body.minutesFromNow;
  if (minutes !== null && (!Number.isInteger(minutes) || (minutes as number) < 1 || (minutes as number) > 720)) {
    return NextResponse.json({ ok: false, error: "ETA must be between 1 and 720 minutes" }, { status: 400 });
  }

  const membership = await resolveNativeRestaurantManager(req, body.restaurantId);
  if (!membership) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const estimatedReadyAt = typeof minutes === "number"
    ? new Date(Date.now() + minutes * 60_000).toISOString()
    : null;
  const { data, error } = await admin.from("orders")
    .update({ estimated_ready_at: estimatedReadyAt, ready_notified_at: null })
    .eq("restaurant_id", membership.restaurantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  return NextResponse.json({ ok: true, estimatedReadyAt });
}

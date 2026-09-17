import { NextResponse } from "next/server";
import { resolveNativeRestaurantManager } from "@/lib/auth/native-bearer";
import { notifyOrderReadyById } from "@/lib/orders/notify-ready";
import { createAdminClient } from "@/lib/supabase/admin";

/** Native equivalent of the owner "Notify customer" action. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let body: { restaurantId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (typeof body.restaurantId !== "string" || !body.restaurantId) {
    return NextResponse.json({ ok: false, error: "Restaurant is required" }, { status: 400 });
  }

  const membership = await resolveNativeRestaurantManager(req, body.restaurantId);
  if (!membership) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id: orderId } = await params;
  const { channels } = await notifyOrderReadyById(createAdminClient(), membership.restaurantId, orderId);
  return NextResponse.json({ ok: channels.length > 0, channels });
}

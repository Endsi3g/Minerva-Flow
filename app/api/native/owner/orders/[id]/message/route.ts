import { NextResponse } from "next/server";
import { resolveNativeRestaurantManager } from "@/lib/auth/native-bearer";
import { sendOrderOwnerMessage } from "@/lib/orders/owner-updates";

/** Owner → customer note on an order: saved on the order and pushed to the customer's phone. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => null) as { restaurantId?: unknown; message?: unknown } | null;
  if (typeof body?.restaurantId !== "string" || !body.restaurantId) {
    return NextResponse.json({ ok: false, error: "Restaurant is required" }, { status: 400 });
  }
  if (typeof body.message !== "string" || !body.message.trim() || body.message.trim().length > 240) {
    return NextResponse.json({ ok: false, error: "Message must be 1 to 240 characters" }, { status: 400 });
  }
  const membership = await resolveNativeRestaurantManager(req, body.restaurantId);
  if (!membership) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const channels = await sendOrderOwnerMessage(membership.restaurantId, id, body.message);
  if (channels === null) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  return NextResponse.json({ ok: true, channels });
}

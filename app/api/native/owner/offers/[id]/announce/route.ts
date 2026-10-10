import { NextResponse } from "next/server";
import { resolveNativeRestaurantManager } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCustomers } from "@/lib/data/notifications";
import { getPrimaryMenuShareLink, isEffectivelyLive } from "@/lib/data/offers";

/**
 * Sends the "new offer" push for an offer the owner just published from the
 * phone. Only for an offer that is live right now, never for a birthday
 * special, and only once (announced_at), mirroring the web createOffer rules.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => null) as { restaurantId?: unknown } | null;
  if (typeof body?.restaurantId !== "string" || !body.restaurantId) {
    return NextResponse.json({ ok: false, error: "Restaurant is required" }, { status: 400 });
  }
  const membership = await resolveNativeRestaurantManager(req, body.restaurantId);
  if (!membership) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: offer } = await admin.from("offers")
    .select("id, title, active, starts_at, ends_at, is_birthday_special, announced_at")
    .eq("restaurant_id", membership.restaurantId).eq("id", id).maybeSingle();
  if (!offer) return NextResponse.json({ ok: false, error: "Offer not found" }, { status: 404 });
  if (offer.announced_at) return NextResponse.json({ ok: false, reason: "already_announced" }, { status: 409 });
  if (offer.is_birthday_special || !isEffectivelyLive({ active: offer.active, startsAt: offer.starts_at, endsAt: offer.ends_at })) {
    return NextResponse.json({ ok: false, reason: "not_live" }, { status: 409 });
  }

  // Claim the announcement first so concurrent requests cannot both send.
  const { data: claimed } = await admin.from("offers")
    .update({ announced_at: new Date().toISOString() })
    .eq("id", id).is("announced_at", null).select("id").maybeSingle();
  if (!claimed) return NextResponse.json({ ok: false, reason: "already_announced" }, { status: 409 });

  await notifyCustomers({
    restaurantId: membership.restaurantId,
    type: "offer.published",
    title: "Nouvelle offre",
    body: offer.title,
    link: (await getPrimaryMenuShareLink(membership.restaurantId)) ?? undefined,
  });
  return NextResponse.json({ ok: true });
}

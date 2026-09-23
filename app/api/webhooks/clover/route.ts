import { NextResponse } from "next/server";
import { getRestaurantIdByPosExternalAccount, getRestaurantTimezoneAdmin } from "@/lib/data/pos-connections";
import { syncCloverSalesForDate } from "@/lib/pos/sync";
import { cloverOrderEvents, dateInTimezone, verifyCloverWebhookAuth, type CloverWebhookPayload } from "@/lib/pos/webhooks";

export async function POST(req: Request) {
  let payload: CloverWebhookPayload;
  try {
    payload = (await req.json()) as CloverWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  // Clover's initial dashboard handshake sends a verification code that the
  // app owner copies back into the dashboard before notifications are enabled.
  if (payload.verificationCode && !payload.merchants) {
    return NextResponse.json({ verificationCode: payload.verificationCode });
  }

  const expectedAuthCode = process.env.CLOVER_WEBHOOK_AUTH_CODE;
  if (!expectedAuthCode) {
    return NextResponse.json({ error: "Webhook Clover non configuré" }, { status: 503 });
  }
  if (!verifyCloverWebhookAuth(expectedAuthCode, req.headers.get("x-clover-auth"))) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const syncTargets = new Map<string, { restaurantId: string; date: string }>();
  for (const event of cloverOrderEvents(payload)) {
    const restaurantId = await getRestaurantIdByPosExternalAccount("clover", event.merchantId);
    if (!restaurantId) continue;
    const timeZone = await getRestaurantTimezoneAdmin(restaurantId);
    const date = dateInTimezone(new Date(event.timestamp), timeZone);
    syncTargets.set(`${restaurantId}:${date}`, { restaurantId, date });
  }

  try {
    const results = await Promise.all(
      [...syncTargets.values()].map((target) => syncCloverSalesForDate(target.restaurantId, target.date))
    );
    if (results.some((result) => result.status === "no_token")) {
      return NextResponse.json({ error: "Connexion Clover sans jeton actif" }, { status: 503 });
    }
  } catch (error) {
    console.error("Clover webhook sync failed", error);
    return NextResponse.json({ error: "Synchronisation Clover temporairement indisponible" }, { status: 503 });
  }

  return NextResponse.json({ received: true, synced: syncTargets.size });
}

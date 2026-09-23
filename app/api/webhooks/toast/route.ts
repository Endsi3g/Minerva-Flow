import { NextResponse } from "next/server";
import { getRestaurantIdByPosExternalAccount, getRestaurantTimezoneAdmin } from "@/lib/data/pos-connections";
import { syncToastSalesForDate } from "@/lib/pos/sync";
import { dateInTimezone, isToastOrderEvent, verifyToastWebhookSignature, type ToastWebhookPayload } from "@/lib/pos/webhooks";

export async function POST(req: Request) {
  const body = await req.text();
  let payload: ToastWebhookPayload;
  try {
    payload = JSON.parse(body) as ToastWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const secret = process.env.TOAST_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook Toast non configuré" }, { status: 503 });
  }
  if (!verifyToastWebhookSignature(secret, body, payload.timestamp, req.headers.get("toast-signature"))) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  if (!isToastOrderEvent(payload)) return NextResponse.json({ received: true, synced: 0 });

  const restaurantGuid = req.headers.get("toast-restaurant-external-id")?.trim();
  if (!restaurantGuid) return NextResponse.json({ error: "Restaurant Toast absent" }, { status: 400 });
  if (payload.details?.restaurantGuid && payload.details.restaurantGuid !== restaurantGuid) {
    return NextResponse.json({ error: "Restaurant Toast incohérent" }, { status: 400 });
  }
  const restaurantId = await getRestaurantIdByPosExternalAccount("toast", restaurantGuid);
  if (!restaurantId) return NextResponse.json({ received: true, synced: 0 });

  const timeZone = await getRestaurantTimezoneAdmin(restaurantId);
  const date = dateInTimezone(new Date(payload.timestamp!), timeZone);
  try {
    const result = await syncToastSalesForDate(restaurantId, date);
    if (result.status === "no_token") {
      return NextResponse.json({ error: "Connexion Toast sans jeton actif" }, { status: 503 });
    }
  } catch (error) {
    console.error("Toast webhook sync failed", error);
    return NextResponse.json({ error: "Synchronisation Toast temporairement indisponible" }, { status: 503 });
  }

  return NextResponse.json({ received: true, synced: 1, date });
}

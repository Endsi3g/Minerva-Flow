import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  getRestaurantIdBySquareMerchant,
  updatePosConnectionStatus,
  getRestaurantTimezoneAdmin,
} from "@/lib/data/pos-connections";
import { syncSquareSalesForDate } from "@/lib/pos/sync";
import { todayInTimezone } from "@/lib/pos/square";

// Basic Square event set — payments, orders and refunds all trigger a
// same-day resync; a revoked authorization marks the connection as broken
// so the Settings UI can prompt the owner to reconnect.
const SYNC_TRIGGER_EVENTS = new Set([
  "payment.created",
  "payment.updated",
  "order.created",
  "order.updated",
  "order.fulfillment.updated",
  "refund.created",
  "refund.updated",
]);

function verifySignature(url: string, body: string, signature: string | null): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !signature) return false;

  const expected = createHmac("sha256", key).update(url + body).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * Receives Square webhook notifications. The notification URL must match
 * exactly what's registered in the Square Developer Dashboard — Square
 * signs each request with HMAC-SHA256(signatureKey, url + rawBody), so we
 * read SQUARE_WEBHOOK_NOTIFICATION_URL rather than trusting req.url, which
 * can differ from the public URL behind a proxy.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature");
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? req.url;

  if (!verifySignature(notificationUrl, body, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const event = JSON.parse(body) as { type?: string; merchant_id?: string };
  if (!event.merchant_id || !event.type) return NextResponse.json({ received: true });

  const restaurantId = await getRestaurantIdBySquareMerchant(event.merchant_id);
  if (!restaurantId) return NextResponse.json({ received: true });

  if (event.type === "oauth.authorization.revoked") {
    await updatePosConnectionStatus(restaurantId, "square", "erreur");
  } else if (SYNC_TRIGGER_EVENTS.has(event.type)) {
    const timeZone = await getRestaurantTimezoneAdmin(restaurantId);
    await syncSquareSalesForDate(restaurantId, todayInTimezone(timeZone));
  }

  return NextResponse.json({ received: true });
}

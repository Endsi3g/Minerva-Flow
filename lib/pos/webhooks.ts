import { createHmac, timingSafeEqual } from "node:crypto";

export type CloverWebhookPayload = {
  verificationCode?: string;
  merchants?: Record<string, Array<{ objectId?: string; type?: string; ts?: number }>>;
};

export type ToastWebhookPayload = {
  timestamp?: string;
  eventCategory?: string;
  eventType?: string;
  guid?: string;
  details?: { restaurantGuid?: string };
};

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyCloverWebhookAuth(expectedAuthCode: string | undefined, suppliedAuthCode: string | null) {
  return Boolean(expectedAuthCode && suppliedAuthCode && safeEqual(expectedAuthCode, suppliedAuthCode));
}

export function verifyToastWebhookSignature(
  secret: string | undefined,
  body: string,
  timestamp: string | undefined,
  signature: string | null
) {
  if (!secret || !timestamp || !signature) return false;
  const expected = createHmac("sha256", secret).update(body + timestamp, "utf8").digest("base64");
  return safeEqual(expected, signature);
}

export function cloverOrderEvents(payload: CloverWebhookPayload) {
  const result: Array<{ merchantId: string; timestamp: number }> = [];
  for (const [merchantId, events] of Object.entries(payload.merchants ?? {})) {
    for (const event of events ?? []) {
      const objectType = event.objectId?.split(":", 1)[0];
      if (
        (objectType === "O" || objectType === "P") &&
        Number.isSafeInteger(event.ts) &&
        event.ts! >= 0 &&
        event.ts! <= 8_640_000_000_000_000
      ) {
        result.push({ merchantId, timestamp: event.ts as number });
      }
    }
  }
  return result;
}

export function isToastOrderEvent(payload: ToastWebhookPayload) {
  const accepted = new Set(["order_updated", "channel_order_updated"]);
  return Boolean(
    payload.guid &&
      payload.timestamp &&
      Number.isFinite(Date.parse(payload.timestamp)) &&
      (accepted.has(payload.eventType ?? "") || accepted.has(payload.eventCategory ?? ""))
  );
}

export function dateInTimezone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

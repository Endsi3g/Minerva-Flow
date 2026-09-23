import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  cloverOrderEvents,
  dateInTimezone,
  isToastOrderEvent,
  verifyCloverWebhookAuth,
  verifyToastWebhookSignature,
} from "../webhooks";

describe("POS webhook verification", () => {
  it("compares Clover auth codes and fails closed when absent", () => {
    expect(verifyCloverWebhookAuth("dashboard-key", "dashboard-key")).toBe(true);
    expect(verifyCloverWebhookAuth("dashboard-key", "wrong")).toBe(false);
    expect(verifyCloverWebhookAuth(undefined, "dashboard-key")).toBe(false);
  });

  it("verifies Toast HMAC over the exact raw body followed by its timestamp", () => {
    const secret = "test-webhook-secret";
    const body = '{"eventType":"order_updated"}';
    const timestamp = "2026-09-23T12:00:00.000Z";
    const signature = createHmac("sha256", secret).update(body + timestamp).digest("base64");
    expect(verifyToastWebhookSignature(secret, body, timestamp, signature)).toBe(true);
    expect(verifyToastWebhookSignature(secret, `${body} `, timestamp, signature)).toBe(false);
    expect(verifyToastWebhookSignature(secret, body, undefined, signature)).toBe(false);
    expect(verifyToastWebhookSignature(undefined, body, timestamp, signature)).toBe(false);
  });

  it("keeps only Clover order/payment events with usable event times", () => {
    expect(cloverOrderEvents({
      merchants: {
        merchantA: [
          { objectId: "O:order-1", ts: 1_790_160_000_000 },
          { objectId: "P:payment-1", ts: 1_790_160_000_001 },
          { objectId: "I:item-1", ts: 1_790_160_000_002 },
          { objectId: "O:bad-time", ts: Number.NaN },
        ],
      },
    })).toEqual([
      { merchantId: "merchantA", timestamp: 1_790_160_000_000 },
      { merchantId: "merchantA", timestamp: 1_790_160_000_001 },
    ]);
  });

  it("accepts only identified Toast order update events", () => {
    expect(isToastOrderEvent({
      guid: "event-guid",
      timestamp: "2026-09-23T12:00:00.000Z",
      eventType: "order_updated",
    })).toBe(true);
    expect(isToastOrderEvent({ guid: "event-guid", timestamp: "invalid", eventType: "order_updated" })).toBe(false);
    expect(isToastOrderEvent({ guid: "event-guid", timestamp: "2026-09-23T12:00:00.000Z", eventType: "stock_updated" })).toBe(false);
  });

  it("uses the restaurant timezone when deriving the sync day", () => {
    expect(dateInTimezone(new Date("2026-09-23T02:30:00.000Z"), "America/Montreal")).toBe("2026-09-22");
  });
});

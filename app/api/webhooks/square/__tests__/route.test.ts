import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRestaurantIdBySquareMerchant: vi.fn(),
  updatePosConnectionStatus: vi.fn(),
  getRestaurantTimezoneAdmin: vi.fn(),
  syncSquareSalesForDate: vi.fn(),
}));

vi.mock("@/lib/data/pos-connections", () => ({
  getRestaurantIdBySquareMerchant: mocks.getRestaurantIdBySquareMerchant,
  updatePosConnectionStatus: mocks.updatePosConnectionStatus,
  getRestaurantTimezoneAdmin: mocks.getRestaurantTimezoneAdmin,
}));
vi.mock("@/lib/pos/sync", () => ({ syncSquareSalesForDate: mocks.syncSquareSalesForDate }));

import { POST } from "../route";

describe("POST /api/webhooks/square", () => {
  const originalEnv = process.env;
  const notificationUrl = "https://hooks.minervaflow.app/api/webhooks/square";
  const secret = "square-webhook-test-secret";

  function request(body: string, signed = true) {
    const signature = createHmac("sha256", secret).update(notificationUrl + body).digest("base64");
    return new Request(notificationUrl, {
      method: "POST",
      headers: signed ? { "x-square-hmacsha256-signature": signature } : {},
      body,
    });
  }

  beforeEach(() => {
    process.env = { ...originalEnv, SQUARE_WEBHOOK_SIGNATURE_KEY: secret, SQUARE_WEBHOOK_NOTIFICATION_URL: notificationUrl };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects unsigned requests before parsing the payload", async () => {
    const response = await POST(request("{", false));
    expect(response.status).toBe(401);
  });

  it("returns a client error for malformed but correctly signed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Payload invalide" });
    expect(mocks.getRestaurantIdBySquareMerchant).not.toHaveBeenCalled();
  });
});

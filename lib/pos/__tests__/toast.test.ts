import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isToastConfigured,
  toastEnvironment,
  toastAuthBaseUrl,
  toastConnectAuthorizeUrl,
  toastApiBaseUrl,
} from "@/lib/pos/config";
import {
  loginToastMachineClient,
  exchangeToastCode,
  fetchToastDailySales,
} from "@/lib/pos/toast";

describe("Toast POS Configuration & API Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Configuration & Environment", () => {
    it("reports not configured when env vars are absent", () => {
      delete process.env.TOAST_CLIENT_ID;
      delete process.env.TOAST_CLIENT_SECRET;
      expect(isToastConfigured()).toBe(false);
    });

    it("reports configured when TOAST_CLIENT_ID and TOAST_CLIENT_SECRET are present", () => {
      process.env.TOAST_CLIENT_ID = "toast-client-123";
      process.env.TOAST_CLIENT_SECRET = "toast-secret-456";
      expect(isToastConfigured()).toBe(true);
    });

    it("resolves sandbox endpoints by default or when environment is sandbox", () => {
      process.env.TOAST_ENVIRONMENT = "sandbox";
      expect(toastEnvironment()).toBe("sandbox");
      expect(toastAuthBaseUrl()).toBe("https://toast-api-server-sandbox.eng.toasttab.com");
      expect(toastConnectAuthorizeUrl()).toBe("https://sandbox.toasttab.com/oauth/authorize");
      expect(toastApiBaseUrl()).toBe("https://toast-api-server-sandbox.eng.toasttab.com");
    });

    it("resolves production endpoints when environment is production", () => {
      process.env.TOAST_ENVIRONMENT = "production";
      expect(toastEnvironment()).toBe("production");
      expect(toastAuthBaseUrl()).toBe("https://api.toasttab.com");
      expect(toastConnectAuthorizeUrl()).toBe("https://toasttab.com/oauth/authorize");
      expect(toastApiBaseUrl()).toBe("https://api.toasttab.com");
    });
  });

  describe("loginToastMachineClient", () => {
    it("authenticates and returns bearer token with expiration", async () => {
      process.env.TOAST_CLIENT_ID = "toast-client";
      process.env.TOAST_CLIENT_SECRET = "toast-secret";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          token: {
            tokenType: "Bearer",
            idToken: "mock-jwt-toast-id-token",
            expiresIn: 86400,
          },
        }),
      });
      global.fetch = mockFetch;

      const result = await loginToastMachineClient();
      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe("mock-jwt-toast-id-token");
      expect(result?.expiresAt).toBeDefined();
    });
  });

  describe("exchangeToastCode", () => {
    it("returns null when credentials are missing", async () => {
      delete process.env.TOAST_CLIENT_ID;
      delete process.env.TOAST_CLIENT_SECRET;
      const res = await exchangeToastCode("code-123", "https://example.com/callback");
      expect(res).toBeNull();
    });

    it("exchanges code for tokens with restaurant GUID", async () => {
      process.env.TOAST_CLIENT_ID = "toast-client";
      process.env.TOAST_CLIENT_SECRET = "toast-secret";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "mock-toast-access-token",
          restaurant_guid: "toast-restaurant-guid-999",
          expires_in: 86400,
        }),
      });
      global.fetch = mockFetch;

      const tokens = await exchangeToastCode("auth-code", "https://minervaflow.app/api/oauth/toast/callback");
      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe("mock-toast-access-token");
      expect(tokens?.restaurantGuid).toBe("toast-restaurant-guid-999");
    });
  });

  describe("fetchToastDailySales", () => {
    it("returns 0 revenue and 0 orders when restaurantGuid is missing", async () => {
      const res = await fetchToastDailySales("token", "", "2026-09-09");
      expect(res).toEqual({ revenue: 0, orderCount: 0 });
    });

    it("fetches orders using businessDate and sums valid completed orders", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { guid: "ord-1", totalAmount: 35.5, voided: false, deleted: false },
          { guid: "ord-2", totalAmount: 14.5, voided: false, deleted: false },
          { guid: "ord-3", totalAmount: 90.0, voided: true, deleted: false }, // Voided: ignored
          { guid: "ord-4", totalAmount: 50.0, voided: false, deleted: true }, // Deleted: ignored
          { guid: "ord-5", totalAmount: 0, voided: false, deleted: false }, // Zero: ignored
        ],
      });
      global.fetch = mockFetch;

      const sales = await fetchToastDailySales("token-xyz", "guid-123", "2026-09-09");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("businessDate=20260909"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Toast-Restaurant-External-ID": "guid-123",
          }),
        })
      );

      expect(sales.orderCount).toBe(2);
      expect(sales.revenue).toBe(50); // 35.50 + 14.50
    });
  });
});

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isCloverConfigured,
  cloverEnvironment,
  cloverAuthBaseUrl,
  cloverApiBaseUrl,
} from "@/lib/pos/config";
import { exchangeCloverCode, fetchCloverDailySales } from "@/lib/pos/clover";


describe("Clover POS Configuration & API Client", () => {
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
      delete process.env.CLOVER_APP_ID;
      delete process.env.CLOVER_APP_SECRET;
      expect(isCloverConfigured()).toBe(false);
    });

    it("reports configured when CLOVER_APP_ID and CLOVER_APP_SECRET are set", () => {
      process.env.CLOVER_APP_ID = "clover-app-123";
      process.env.CLOVER_APP_SECRET = "clover-secret-456";
      expect(isCloverConfigured()).toBe(true);
    });

    it("resolves sandbox endpoints by default or when environment is sandbox", () => {
      process.env.CLOVER_ENVIRONMENT = "sandbox";
      expect(cloverEnvironment()).toBe("sandbox");
      expect(cloverAuthBaseUrl()).toBe("https://sandbox.dev.clover.com");
      expect(cloverApiBaseUrl()).toBe("https://apisandbox.dev.clover.com");
    });

    it("resolves production endpoints when environment is production", () => {
      process.env.CLOVER_ENVIRONMENT = "production";
      expect(cloverEnvironment()).toBe("production");
      expect(cloverAuthBaseUrl()).toBe("https://clover.com");
      expect(cloverApiBaseUrl()).toBe("https://api.clover.com");
    });
  });

  describe("exchangeCloverCode", () => {
    it("returns null if credentials are missing", async () => {
      delete process.env.CLOVER_APP_ID;
      delete process.env.CLOVER_APP_SECRET;
      const res = await exchangeCloverCode("test-code", "https://example.com/callback");
      expect(res).toBeNull();
    });

    it("exchanges code for tokens successfully via POST", async () => {
      process.env.CLOVER_APP_ID = "app-id";
      process.env.CLOVER_APP_SECRET = "app-secret";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "mock-clover-access-token",
          access_token_expiration: Math.floor(Date.now() / 1000) + 86400,
        }),
      });
      global.fetch = mockFetch;

      const tokens = await exchangeCloverCode("auth-code-xyz", "https://minervaflow.app/api/oauth/clover/callback");
      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe("mock-clover-access-token");
      expect(tokens?.expiresAt).toBeDefined();
    });
  });

  describe("fetchCloverDailySales", () => {
    it("returns 0 revenue and 0 orders when merchantId is missing", async () => {
      const res = await fetchCloverDailySales("token", "", "2026-09-09", "America/Toronto");
      expect(res).toEqual({ revenue: 0, orderCount: 0 });
    });

    it("aggregates completed orders correctly and ignores voided/deleted orders", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          elements: [
            { id: "ord-1", total: 2450, state: "locked" }, // 24.50 $
            { id: "ord-2", total: 1800, state: "locked" }, // 18.00 $
            { id: "ord-3", total: 5000, state: "deleted" }, // Ignore
            { id: "ord-4", total: 0, state: "locked" }, // Ignore empty
          ],
        }),
      });
      global.fetch = mockFetch;

      const sales = await fetchCloverDailySales(
        "mock-token",
        "merchant-123",
        "2026-09-09",
        "America/Toronto"
      );

      expect(sales.orderCount).toBe(2);
      expect(sales.revenue).toBe(42.5); // 24.50 + 18.00
    });
  });
});

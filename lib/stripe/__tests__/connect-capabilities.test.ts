import { describe, expect, it } from "vitest";
import { canAcceptRestaurantOnlinePayments, isRestaurantConnectReady } from "@/lib/stripe/connect-capabilities";

describe("restaurant Stripe Connect readiness", () => {
  it("preserves readiness for existing V1 restaurants using charges_enabled", () => {
    expect(isRestaurantConnectReady({
      apiVersion: "v1",
      legacyChargesEnabled: true,
      transfersStatus: "unrequested",
      payoutsStatus: "unrequested",
    })).toBe(true);
  });

  it("does not treat a V1 account as ready when charges are disabled", () => {
    expect(isRestaurantConnectReady({
      apiVersion: "v1",
      legacyChargesEnabled: false,
      transfersStatus: "active",
      payoutsStatus: "active",
    })).toBe(false);
  });

  it("requires both transfer and payout capabilities for V2 recipients", () => {
    for (const status of ["pending", "restricted", "unsupported", "unrequested"] as const) {
      expect(isRestaurantConnectReady({
        apiVersion: "v2",
        legacyChargesEnabled: true,
        transfersStatus: status,
        payoutsStatus: "active",
      })).toBe(false);
      expect(isRestaurantConnectReady({
        apiVersion: "v2",
        legacyChargesEnabled: true,
        transfersStatus: "active",
        payoutsStatus: status,
      })).toBe(false);
    }
    expect(isRestaurantConnectReady({
      apiVersion: "v2",
      legacyChargesEnabled: false,
      transfersStatus: "active",
      payoutsStatus: "active",
    })).toBe(true);
  });

  it("requires platform configuration and an enabled restaurant account before exposing online payment", () => {
    const readyV2 = {
      platformConfigured: true,
      accountId: "acct_restaurant",
      apiVersion: "v2" as const,
      legacyChargesEnabled: false,
      transfersStatus: "active" as const,
      payoutsStatus: "active" as const,
    };

    expect(canAcceptRestaurantOnlinePayments({ ...readyV2, platformConfigured: false })).toBe(false);
    expect(canAcceptRestaurantOnlinePayments({ ...readyV2, accountId: null })).toBe(false);
    expect(canAcceptRestaurantOnlinePayments({ ...readyV2, transfersStatus: "restricted" })).toBe(false);
    expect(canAcceptRestaurantOnlinePayments(readyV2)).toBe(true);
  });
});

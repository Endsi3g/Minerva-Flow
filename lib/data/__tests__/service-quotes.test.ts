import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { submitPublicServiceQuote } from "../service-quotes";

describe("submitPublicServiceQuote", () => {
  it("accepts a verified native customer context without a public menu token", async () => {
    const result = await submitPublicServiceQuote(null, {
      quoteType: "catering",
      guestName: "Ada Client",
      guestPhone: "+15145551234",
      guestEmail: "ada@example.com",
      description: "",
      eventAtLocal: "2026-10-01T12:00:00Z",
      guestCount: 12,
      fulfillmentMode: "sur_place",
    }, { restaurantId: "restaurant-1", customerId: "customer-1" });

    // Contact details are valid, so reaching the details check proves that
    // the authenticated native flow did not get rejected for lacking a menu token.
    expect(result).toEqual({ ok: false, reason: "details_invalid" });
  });

  it("still requires a menu token for an unauthenticated public request", async () => {
    const result = await submitPublicServiceQuote(null, {
      quoteType: "catering",
      guestName: "Ada Client",
      guestPhone: "+15145551234",
      guestEmail: "ada@example.com",
      description: "A catered lunch for a small team.",
      eventAtLocal: "2026-10-01T12:00:00Z",
      guestCount: 12,
      fulfillmentMode: "sur_place",
    });

    expect(result).toEqual({ ok: false, reason: "contact_invalid" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveNativeCustomer: vi.fn(),
  submitPublicServiceQuote: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth/native-bearer", () => ({ resolveNativeCustomer: mocks.resolveNativeCustomer }));
vi.mock("@/lib/data/service-quotes", () => ({ submitPublicServiceQuote: mocks.submitPublicServiceQuote }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { GET, POST } from "../route";

describe("POST /api/portal/service-quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveNativeCustomer.mockResolvedValue({
      id: "customer-1",
      restaurantId: "restaurant-1",
      name: "Ada Client",
      phone: "+15145551234",
      email: "ada@example.com",
    });
    mocks.submitPublicServiceQuote.mockResolvedValue({ ok: true, id: "quote-1" });
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });
  });

  it("requires authentication before exposing quote history", async () => {
    mocks.resolveNativeCustomer.mockResolvedValue(null);
    const response = await GET(new Request("https://minervaflow.app/api/portal/service-quotes"));

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns the customer's current production and payment state for a converted quote", async () => {
    const quoteQuery = {
      select: vi.fn(() => quoteQuery),
      eq: vi.fn(() => quoteQuery),
      order: vi.fn(() => quoteQuery),
      limit: vi.fn().mockResolvedValue({
        error: null,
        data: [{
          id: "quote-1",
          restaurant_id: "restaurant-1",
          quote_type: "catering",
          status: "converted",
          event_at: "2026-10-01T16:00:00.000Z",
          guest_count: 12,
          fulfillment_mode: "sur_place",
          currency: "CAD",
          subtotal: 200,
          tax_amount: 30,
          total: 240,
          deposit_percent: 30,
          deposit_amount: 72,
          expires_at: null,
          checkout_url: "https://checkout.stripe.com/session",
          owner_notes: "Livraison incluse; choix végétariens confirmés.",
          converted_order_id: "order-1",
        }],
      }),
    };
    const ordersQuery = {
      select: vi.fn(() => ordersQuery),
      eq: vi.fn(() => ordersQuery),
      in: vi.fn().mockResolvedValue({
        error: null,
        data: [{ id: "order-1", status: "en_preparation", payment_status: "en_attente" }],
      }),
    };
    const linesQuery = {
      select: vi.fn(() => linesQuery),
      in: vi.fn(() => linesQuery),
      order: vi.fn().mockResolvedValue({
        error: null,
        data: [{
          id: "line-1",
          quote_id: "quote-1",
          name: "Plateaux-repas",
          description: "Option végétarienne comprise",
          quantity: 2,
          unit_price: 100,
          sort_order: 0,
        }],
      }),
    };
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => table === "service_quotes" ? quoteQuery : table === "service_quote_lines" ? linesQuery : ordersQuery),
    });

    const response = await GET(new Request("https://minervaflow.app/api/portal/service-quotes"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.quotes).toEqual([expect.objectContaining({
      id: "quote-1",
      status: "converted",
      order_status: "en_preparation",
      payment_status: "en_attente",
      guest_count: 12,
      subtotal: 200,
      tax_amount: 30,
      deposit_percent: 30,
      owner_notes: "Livraison incluse; choix végétariens confirmés.",
      service_quote_lines: [{
        id: "line-1",
        name: "Plateaux-repas",
        description: "Option végétarienne comprise",
        quantity: 2,
        unit_price: 100,
      }],
    })]);
  });

  it("requires the authenticated native customer context", async () => {
    mocks.resolveNativeCustomer.mockResolvedValue(null);
    const response = await POST(new Request("https://minervaflow.app/api/portal/service-quotes", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(mocks.submitPublicServiceQuote).not.toHaveBeenCalled();
  });

  it("binds the quote to the verified customer and their restaurant, not client-supplied ids", async () => {
    const response = await POST(new Request("https://minervaflow.app/api/portal/service-quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        restaurantId: "attacker-restaurant",
        customerId: "attacker-customer",
        quoteType: "catering",
        guestName: "Ada Updated",
        guestPhone: "+15145551234",
        guestEmail: "ada@example.com",
        description: "A catered lunch for a small team.",
        eventAtLocal: "2026-10-01T12:00:00Z",
        guestCount: 12,
        fulfillmentMode: "sur_place",
        clientNotes: "Vegetarian options requested.",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.submitPublicServiceQuote).toHaveBeenCalledWith(null, expect.objectContaining({
      quoteType: "catering",
      guestName: "Ada Updated",
      guestCount: 12,
    }), { restaurantId: "restaurant-1", customerId: "customer-1" });
  });

  it("rejects malformed JSON without creating a quote", async () => {
    const response = await POST(new Request("https://minervaflow.app/api/portal/service-quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    }));

    expect(response.status).toBe(400);
    expect(mocks.submitPublicServiceQuote).not.toHaveBeenCalled();
  });

  it("rejects JSON primitives instead of throwing while reading fields", async () => {
    const response = await POST(new Request("https://minervaflow.app/api/portal/service-quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null",
    }));

    expect(response.status).toBe(400);
    expect(mocks.submitPublicServiceQuote).not.toHaveBeenCalled();
  });

  it("enforces the body limit even if the request omits a content-length header", async () => {
    const response = await POST(new Request("https://minervaflow.app/api/portal/service-quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteType: "catering", fulfillmentMode: "sur_place", description: "x".repeat(17_000) }),
    }));

    expect(response.status).toBe(413);
    expect(mocks.submitPublicServiceQuote).not.toHaveBeenCalled();
  });

  it("rejects unknown request types instead of silently changing the service requested", async () => {
    const response = await POST(new Request("https://minervaflow.app/api/portal/service-quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteType: "something-else", fulfillmentMode: "sur_place" }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.submitPublicServiceQuote).not.toHaveBeenCalled();
  });
});

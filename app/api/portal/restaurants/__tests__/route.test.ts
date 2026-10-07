import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveNativeUserContext: vi.fn(),
  createAdminClient: vi.fn(),
  customerSelect: vi.fn(),
  customerEq: vi.fn(),
  restaurantSelect: vi.fn(),
  restaurantIn: vi.fn(),
}));

vi.mock("@/lib/auth/native-bearer", () => ({
  resolveNativeUserContext: mocks.resolveNativeUserContext,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET } from "../route";

describe("GET /api/portal/restaurants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.customerSelect.mockReturnValue({ eq: mocks.customerEq });
    mocks.customerEq.mockResolvedValue({
      data: [{
        id: "customer-1",
        restaurant_id: "restaurant-1",
        visit_count: 4,
        total_spent: 52.5,
        loyalty_points: 120,
      }],
      error: null,
    });
    mocks.restaurantSelect.mockReturnValue({ in: mocks.restaurantIn });
    mocks.restaurantIn.mockResolvedValue({
      data: [{ id: "restaurant-1", name: "Café Exemple" }],
      error: null,
    });
    mocks.resolveNativeUserContext.mockResolvedValue({
      userId: "user-1",
      client: { from: (table: string) => {
        expect(table).toBe("customers");
        return { select: mocks.customerSelect };
      } },
    });
    mocks.createAdminClient.mockReturnValue({ from: (table: string) => {
      expect(table).toBe("restaurants");
      return { select: mocks.restaurantSelect };
    } });
  });

  it("requires an authenticated app user", async () => {
    mocks.resolveNativeUserContext.mockResolvedValue(null);
    const response = await GET(new Request("https://minervaflow.app/api/portal/restaurants"));

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns restaurant names only for the caller's own customer rows", async () => {
    const response = await GET(new Request("https://minervaflow.app/api/portal/restaurants"));

    expect(response.status).toBe(200);
    expect(mocks.customerSelect).toHaveBeenCalledWith("id, restaurant_id, visit_count, total_spent, loyalty_points");
    expect(mocks.customerEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.restaurantSelect).toHaveBeenCalledWith("id, name");
    expect(mocks.restaurantIn).toHaveBeenCalledWith("id", ["restaurant-1"]);
    await expect(response.json()).resolves.toEqual({
      memberships: [{
        customerId: "customer-1",
        restaurantId: "restaurant-1",
        restaurantName: "Café Exemple",
        visitCount: 4,
        totalSpent: 52.5,
        loyaltyPoints: 120,
      }],
    });
  });

  it("returns an empty list without making an admin lookup when the caller has no cards", async () => {
    mocks.customerEq.mockResolvedValue({ data: [], error: null });
    const response = await GET(new Request("https://minervaflow.app/api/portal/restaurants"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ memberships: [] });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("reports an unavailable restaurant-name lookup instead of silently hiding the error", async () => {
    mocks.restaurantIn.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const response = await GET(new Request("https://minervaflow.app/api/portal/restaurants"));

    expect(response.status).toBe(503);
  });
});

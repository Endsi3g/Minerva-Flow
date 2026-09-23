import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveNativeCustomer: vi.fn(),
  getActiveMenuItemsForCustomers: vi.fn(),
  getRestaurantOrderSettings: vi.fn(),
  createAdminClient: vi.fn(),
  recordMenuView: vi.fn(),
}));

vi.mock("@/lib/auth/native-bearer", () => ({ resolveNativeCustomer: mocks.resolveNativeCustomer }));
vi.mock("@/lib/data/menu", () => ({ getActiveMenuItemsForCustomers: mocks.getActiveMenuItemsForCustomers }));
vi.mock("@/lib/data/menu-shares", () => ({ getRestaurantOrderSettings: mocks.getRestaurantOrderSettings }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/data/menu-views", () => ({ recordMenuView: mocks.recordMenuView }));

import { GET } from "../route";

describe("GET /api/portal/menu checkout capabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveNativeCustomer.mockResolvedValue({ id: "customer-1", restaurantId: "restaurant-1" });
    mocks.getActiveMenuItemsForCustomers.mockResolvedValue([{ id: "item-1" }]);
    mocks.getRestaurantOrderSettings.mockResolvedValue({
      taxRate: 0.14975,
      acceptsTips: true,
      onlinePaymentEnabled: true,
      orderModesEnabled: ["prep_apres_paiement"],
      delivery: { config: { enabled: false } },
    });
    mocks.createAdminClient.mockReturnValue({});
    mocks.recordMenuView.mockResolvedValue(undefined);
  });

  it("returns the restaurant's effective choices, not raw Stripe availability", async () => {
    const response = await GET(new Request("https://minervaflow.app/api/portal/menu"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      onlinePaymentEnabled: true,
      canPayAtReceipt: false,
      canPayOnline: true,
      pickupEnabled: true,
      deliveryEnabled: false,
    });
  });

  it("does not offer pickup when the restaurant is configured for delivery only", async () => {
    mocks.getRestaurantOrderSettings.mockResolvedValue({
      taxRate: 0.14975,
      acceptsTips: false,
      onlinePaymentEnabled: false,
      orderModesEnabled: ["livraison"],
      delivery: { config: { enabled: true } },
    });

    const response = await GET(new Request("https://minervaflow.app/api/portal/menu"));
    const body = await response.json();

    expect(body).toMatchObject({
      canPayAtReceipt: true,
      canPayOnline: false,
      pickupEnabled: false,
      deliveryEnabled: true,
    });
  });

  it("fails closed when order settings are unavailable", async () => {
    mocks.getRestaurantOrderSettings.mockResolvedValue(null);

    const response = await GET(new Request("https://minervaflow.app/api/portal/menu"));
    const body = await response.json();

    expect(body).toMatchObject({
      canPayAtReceipt: false,
      canPayOnline: false,
      pickupEnabled: false,
      deliveryEnabled: false,
    });
  });
});

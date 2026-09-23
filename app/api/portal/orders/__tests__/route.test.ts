import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveNativeCustomer: vi.fn(),
  submitPortalOrder: vi.fn(),
}));

vi.mock("@/lib/auth/native-bearer", () => ({
  resolveNativeCustomer: mocks.resolveNativeCustomer,
}));

vi.mock("@/lib/data/customer-portal", () => ({
  submitPortalOrder: mocks.submitPortalOrder,
}));

import { POST } from "../route";

describe("POST /api/portal/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveNativeCustomer.mockResolvedValue({ id: "customer-1" });
    mocks.submitPortalOrder.mockResolvedValue({ ok: true, orderId: "order-1" });
  });

  it("discards client-supplied delivery coordinates before pricing", async () => {
    const request = new Request("http://localhost/api/portal/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cart: [{ menuItemId: "item-1", quantity: 1 }],
        delivery: {
          address: "100 Queen St W, Toronto, ON",
          latitude: 0,
          longitude: 0,
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.submitPortalOrder).toHaveBeenCalledWith(
      { id: "customer-1" },
      [{ menuItemId: "item-1", quantity: 1 }],
      0,
      null,
      "mobile",
      { address: "100 Queen St W, Toronto, ON" },
      null,
      false
    );
  });

  it("does not call order submission when the cart is empty", async () => {
    const request = new Request("http://localhost/api/portal/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cart: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.submitPortalOrder).not.toHaveBeenCalled();
  });
});

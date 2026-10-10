import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNativeRestaurantManager } from "@/lib/auth/native-bearer";
import { POST } from "./route";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/native-bearer", () => ({ resolveNativeRestaurantManager: vi.fn() }));

const mockAdmin = vi.mocked(createAdminClient);
const mockManager = vi.mocked(resolveNativeRestaurantManager);

function makeRequest(body: unknown) {
  return new Request("https://www.minervaflow.app/api/native/owner/orders/order-1/eta", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("native owner order ETA route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects customers and users without an active owner/manager membership", async () => {
    mockManager.mockResolvedValue(null);
    const response = await POST(makeRequest({ restaurantId: "restaurant-1", minutesFromNow: 30 }), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(response.status).toBe(403);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("rejects invalid ETA values before any privileged write", async () => {
    const response = await POST(makeRequest({ restaurantId: "restaurant-1", minutesFromNow: 721 }), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(response.status).toBe(400);
    expect(mockManager).not.toHaveBeenCalled();
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("updates an order only inside the caller's authorized restaurant", async () => {
    mockManager.mockResolvedValue({ client: {} as never, userId: "owner-1", restaurantId: "restaurant-1", role: "owner" });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "order-1" }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const filters: unknown[][] = [];
    const query = {
      eq: vi.fn((...args: unknown[]) => { filters.push(args); return query; }),
      select,
    };
    const update = vi.fn().mockReturnValue(query);
    mockAdmin.mockReturnValue({ from: vi.fn().mockReturnValue({ update }) } as never);

    const response = await POST(makeRequest({ restaurantId: "restaurant-1", minutesFromNow: 30 }), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ ready_notified_at: null }));
    expect(filters).toEqual([["restaurant_id", "restaurant-1"], ["id", "order-1"]]);
    expect(await response.json()).toMatchObject({ ok: true });
  });
});

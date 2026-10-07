import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveNativeUserContext: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth/native-bearer", () => ({
  resolveNativeUserContext: mocks.resolveNativeUserContext,
}));

import { GET } from "../route";

describe("GET /api/portal/scan/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveNativeUserContext.mockResolvedValue({
      userId: "user-1",
      client: { rpc: mocks.rpc },
    });
    mocks.rpc.mockResolvedValue({
      data: [{ restaurant_id: "restaurant-1", restaurant_name: "Café Exemple" }],
      error: null,
    });
  });

  it("requires an authenticated app user", async () => {
    mocks.resolveNativeUserContext.mockResolvedValue(null);
    const response = await GET(new Request("https://minervaflow.app/api/portal/scan/qr-token"), {
      params: Promise.resolve({ token: "qr-token" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("resolves only the scanned token through the scoped database function", async () => {
    const response = await GET(new Request("https://minervaflow.app/api/portal/scan/qr-token"), {
      params: Promise.resolve({ token: "qr-token" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("resolve_restaurant_connection", { p_token: "qr-token" });
    await expect(response.json()).resolves.toEqual({
      restaurantId: "restaurant-1",
      restaurantName: "Café Exemple",
      branding: null,
    });
  });

  it("returns 404 for unknown tokens and 503 when the resolver is unavailable", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    const unknown = await GET(new Request("https://minervaflow.app/api/portal/scan/unknown"), {
      params: Promise.resolve({ token: "unknown" }),
    });
    expect(unknown.status).toBe(404);

    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "resolver unavailable" } });
    const unavailable = await GET(new Request("https://minervaflow.app/api/portal/scan/other"), {
      params: Promise.resolve({ token: "other" }),
    });
    expect(unavailable.status).toBe(503);
  });
});

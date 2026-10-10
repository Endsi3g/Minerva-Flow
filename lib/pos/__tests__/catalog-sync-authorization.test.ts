import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MenuItem } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(), connections: vi.fn(), admin: vi.fn(),
  cloverToken: vi.fn(), cloverWrite: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/current-restaurant", () => ({ getCurrentMembership: mocks.membership }));
vi.mock("@/lib/data/pos-connections", () => ({ getPosConnections: mocks.connections }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("../clover", () => ({
  getValidCloverAccessToken: mocks.cloverToken, upsertCloverCatalogItem: mocks.cloverWrite,
  deleteCloverCatalogItem: vi.fn(), updateCloverItemStock: vi.fn(), fetchCloverCatalogItems: vi.fn(),
}));
vi.mock("../square", () => ({
  getValidSquareAccessToken: vi.fn(), upsertSquareCatalogItem: vi.fn(),
  deleteSquareCatalogObject: vi.fn(), updateSquareInventoryCount: vi.fn(),
  fetchSquareCatalogItems: vi.fn(), fetchSquareInventoryCounts: vi.fn(), getSquareDefaultLocationId: vi.fn(),
}));

import { getConnectedCatalogProviders, pushMenuItemToProvider } from "../catalog-sync";

const item = { id: "item-1", restaurantId: "restaurant-1", name: "Plat de poisson", price: 0, active: false } as MenuItem;

function configurePublication(isDraft: boolean | null, readFailed = false) {
  const db = {
    from: vi.fn((table: string) => {
      const query = {
        select: vi.fn(() => query), eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => table === "menu_items"
          ? { data: isDraft === null ? null : { is_draft: isDraft }, error: readFailed ? { message: "unavailable" } : null }
          : { data: null, error: null }),
        upsert: vi.fn(async () => ({ error: null })),
      };
      return query;
    }),
  };
  mocks.admin.mockReturnValue(db);
  return db;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ restaurantId: "restaurant-1", role: "owner" });
  mocks.connections.mockResolvedValue([{ provider: "clover", status: "connecte" }]);
  mocks.cloverToken.mockResolvedValue({ accessToken: "test-token", merchantId: "test-merchant" });
  mocks.cloverWrite.mockResolvedValue("external-item-1");
});

describe("catalog synchronization authorization", () => {
  it.each([null, { restaurantId: "restaurant-1", role: "staff" }, { restaurantId: "restaurant-1", role: "customer" },
    { restaurantId: "another-restaurant", role: "owner" }])("rejects an unauthorized membership: %j", async (membership) => {
    mocks.membership.mockResolvedValue(membership);
    expect(await getConnectedCatalogProviders("restaurant-1")).toEqual([]);
    expect(mocks.connections).not.toHaveBeenCalled();
  });

  it.each(["owner", "manager"])("allows an active %s membership resolved by the server", async (role) => {
    mocks.membership.mockResolvedValue({ restaurantId: "restaurant-1", role });
    expect(await getConnectedCatalogProviders("restaurant-1")).toEqual(["clover"]);
  });

  it("never exports a draft with a placeholder price", async () => {
    configurePublication(true);
    expect(await pushMenuItemToProvider("restaurant-1", "clover", item)).toBe(false);
    expect(mocks.cloverToken).not.toHaveBeenCalled();
    expect(mocks.cloverWrite).not.toHaveBeenCalled();
  });

  it.each([[null, false], [false, true]] as const)("fails closed when publication cannot be verified (%j)", async (draft, error) => {
    configurePublication(draft, error);
    expect(await pushMenuItemToProvider("restaurant-1", "clover", item)).toBe(false);
    expect(mocks.cloverWrite).not.toHaveBeenCalled();
  });

  it("rejects an item from another restaurant before reading tokens", async () => {
    expect(await pushMenuItemToProvider("another-restaurant", "clover", item)).toBe(false);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.cloverToken).not.toHaveBeenCalled();
  });

  it("can push a reviewed item with its confirmed price", async () => {
    configurePublication(false);
    expect(await pushMenuItemToProvider("restaurant-1", "clover", { ...item, price: 18, active: true })).toBe(true);
    expect(mocks.cloverWrite).toHaveBeenCalledWith("test-token", "test-merchant", {
      externalId: null, name: "Plat de poisson", price: 18, active: true,
    });
  });
});

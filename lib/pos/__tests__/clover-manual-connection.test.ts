import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ membership: vi.fn(), merchant: vi.fn(), save: vi.fn(), backfill: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/lib/data/current-restaurant", () => ({ getCurrentMembership: mock.membership }));
vi.mock("@/lib/data/pos-connections", () => ({ savePosConnectionTokens: mock.save, getPosConnections: vi.fn(), getRestaurantTimezoneAdmin: vi.fn() }));
vi.mock("@/lib/pos/clover", () => ({ validateAndFetchCloverMerchant: mock.merchant }));
vi.mock("@/lib/pos/sync", () => ({ backfillPosHistory: mock.backfill, syncPosSalesForDate: vi.fn() }));
vi.mock("@/lib/pos/toast", () => ({ loginToastMachineClient: vi.fn() }));
vi.mock("@/lib/pos/catalog-import", () => ({ importCloverCatalogAsDrafts: vi.fn() }));
import { connectCloverWithTokenAction } from "@/app/[locale]/(app)/settings/pos-actions";
const owner = { restaurantId: "restaurant", role: "owner" };
beforeEach(() => {
  vi.clearAllMocks(); mock.membership.mockResolvedValue(owner);
  mock.merchant.mockResolvedValue({ valid: true, merchantName: "Test restaurant" });
  mock.save.mockResolvedValue(undefined); mock.backfill.mockResolvedValue(undefined);
});
describe("Manual Clover connection safety", () => {
  it.each([null, { ...owner, role: "staff" }, { ...owner, role: "customer" }])("rejects membership %s without provider access", async membership => {
    mock.membership.mockResolvedValue(membership);
    expect((await connectCloverWithTokenAction("MERCHANT", "token")).success).toBe(false);
    expect(mock.merchant).not.toHaveBeenCalled(); expect(mock.save).not.toHaveBeenCalled();
  });
  it("does not save an unverified merchant", async () => {
    mock.merchant.mockResolvedValue({ valid: false });
    expect((await connectCloverWithTokenAction("MERCHANT", "token")).success).toBe(false);
    expect(mock.save).not.toHaveBeenCalled();
  });
  it.each([null, { ...owner, role: "customer" }, { ...owner, restaurantId: "other-restaurant" }])("rejects rights changed during provider validation: %s", async current => {
    mock.membership.mockResolvedValueOnce(owner).mockResolvedValueOnce(current);
    expect((await connectCloverWithTokenAction("MERCHANT", "token")).success).toBe(false);
    expect(mock.save).not.toHaveBeenCalled();
  });
  it("returns a recoverable failure rather than connected when storage fails", async () => {
    mock.save.mockRejectedValue(new Error("vault failed"));
    expect(await connectCloverWithTokenAction("MERCHANT", "token")).toMatchObject({ success: false, error: expect.any(String) });
    expect(mock.backfill).not.toHaveBeenCalled(); expect(mock.revalidate).not.toHaveBeenCalled();
  });
  it.each(["owner", "manager"])("stores a matching merchant for the active %s", async role => {
    mock.membership.mockResolvedValue({ ...owner, role });
    expect(await connectCloverWithTokenAction(" MERCHANT ", " token ")).toEqual({ success: true, merchantName: "Test restaurant" });
    expect(mock.save).toHaveBeenCalledWith("restaurant", "clover", { accessToken: "token", externalAccountId: "MERCHANT" });
    expect(mock.backfill).toHaveBeenCalledWith("clover", "restaurant");
  });
});

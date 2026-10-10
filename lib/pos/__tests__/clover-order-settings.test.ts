import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ membership: vi.fn(), client: vi.fn(), token: vi.fn(), product: vi.fn(), type: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/data/current-restaurant", () => ({ getCurrentMembership: mock.membership }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mock.client }));
vi.mock("@/lib/pos/clover", () => ({ getValidCloverAccessToken: mock.token }));
vi.mock("@/lib/pos/clover-order-api", () => ({ CloverOrderApi: class { product = mock.product; orderType = mock.type; } }));
import { getCloverOrderSetupAction, saveCloverOrderMappingAction, saveCloverOrderSetupAction } from "@/app/[locale]/(app)/settings/clover-order-actions";

const config = { orderTypeId: "PICKUP", enabled: false, employeeAttribution: true, automaticCancellation: false };
const mapping = { menuItemId: "meal", priceOptionId: "small", cloverItemId: "ITEM", modifierIds: [] };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("CLOVER_ORDER_EXPORT_VALIDATED", ""); vi.stubEnv("CLOVER_AUTOMATIC_CANCELLATION_VALIDATED", "");
  mock.membership.mockResolvedValue({ restaurantId: "restaurant", role: "owner" });
  mock.token.mockResolvedValue({ accessToken: "unit-test-token", merchantId: "MERCHANT" });
  mock.type.mockResolvedValue({ id: "PICKUP", isHidden: false });
  mock.product.mockResolvedValue({ id: "ITEM", price: 1000, priceType: "FIXED", modifiers: [] });
  mock.upsert.mockResolvedValue({ error: null });
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: { price: 10, is_draft: false, price_options: [{ id: "small", label: "Petit", price: 10 }] }, error: null });
  mock.client.mockResolvedValue({ from: vi.fn(() => ({ ...query, upsert: mock.upsert })) });
});
afterEach(() => vi.unstubAllEnvs());
describe("Clover owner settings authorization and live validation", () => {
  it.each([null, { restaurantId: "restaurant", role: "staff" }, { restaurantId: "restaurant", role: "customer" }, { restaurantId: "another-restaurant", role: "owner" }])("denies all settings operations for %s before token or database access", async membership => {
    mock.membership.mockResolvedValue(membership);
    expect(await getCloverOrderSetupAction("restaurant")).toEqual({ ok: false, reason: "unauthorized" });
    expect(await saveCloverOrderSetupAction("restaurant",config)).toEqual({ ok: false, reason: "unauthorized" });
    expect(await saveCloverOrderMappingAction("restaurant",mapping)).toEqual({ ok: false, reason: "unauthorized" });
    expect(mock.client).not.toHaveBeenCalled(); expect(mock.token).not.toHaveBeenCalled();
  });
  it("prevents enabling order export before real merchant validation", async () => {
    expect(await saveCloverOrderSetupAction("restaurant",{ ...config, enabled: true })).toEqual({ ok: false, reason: "merchant_validation_required" });
    expect(mock.token).not.toHaveBeenCalled(); expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("prevents enabling cancellation before real merchant validation", async () => {
    expect(await saveCloverOrderSetupAction("restaurant",{ ...config, automaticCancellation: true })).toEqual({ ok: false, reason: "merchant_validation_required" });
    expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("verifies the merchant order type before saving employee attribution", async () => {
    expect(await saveCloverOrderSetupAction("restaurant",config)).toEqual({ ok: true });
    expect(mock.type).toHaveBeenCalledWith("PICKUP");
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({ restaurant_id: "restaurant", merchant_id: "MERCHANT", employee_attribution: true, enabled: false }));
  });
  it("does not save a hidden or foreign order type", async () => {
    mock.type.mockResolvedValue({ id: "PICKUP", isHidden: true });
    expect(await saveCloverOrderSetupAction("restaurant",config)).toEqual({ ok: false, reason: "invalid_order_type" });
    expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("verifies the exact format's actual Clover price before persisting a mapping", async () => {
    expect(await saveCloverOrderMappingAction("restaurant",mapping)).toEqual({ ok: true });
    expect(mock.product).toHaveBeenCalledWith("ITEM");
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({ menu_item_id: "meal", price_option_id: "small", merchant_id: "MERCHANT", clover_item_id: "ITEM" }));
  });
  it("does not persist a mapping with a different price", async () => {
    mock.product.mockResolvedValue({ id: "ITEM", price: 1100, priceType: "FIXED", modifiers: [] });
    expect(await saveCloverOrderMappingAction("restaurant",mapping)).toEqual({ ok: false, reason: "catalog_price_mismatch" });
    expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("does not replace a format with an unspecified base product", async () => {
    expect(await saveCloverOrderMappingAction("restaurant",{ ...mapping, priceOptionId: "" })).toEqual({ ok: false, reason: "invalid_format" });
    expect(mock.product).not.toHaveBeenCalled(); expect(mock.upsert).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assertCloverCheckoutAmounts, buildCloverAtomicPayload, cents, cloverOrderReference, parseCloverOrderReference, type CloverOrderSnapshot } from "../clover-order-contract";
import { processCloverOrderJob, type CloverExportJob } from "../clover-order-worker";

const orderId = "11111111-1111-4111-8111-111111111111";
function snapshot(): CloverOrderSnapshot {
  return { id: orderId, subtotal: 20, tax_amount: 3, tip_amount: 0, delivery_fee: 0, total: 23,
    payment_status: "non_requis", notes: "Retrait à 18 h", created_at: "2026-10-09T12:00:00Z",
    items: [{ id: "line", menu_item_id: "meal", item_name: "Repas", unit_price: 10, quantity: 2,
      price_option_id: "small", price_option_label: "Petit", notes: "Sans sel" }] };
}
const mappings = [{ menu_item_id: "meal", price_option_id: "small", clover_item_id: "ITEM", modifier_ids: ["MOD"] }];
const products = [{ id: "ITEM", price: 900, priceType: "FIXED", modifiers: [{ id: "MOD", amount: 100 }] }];
function job(overrides: Partial<CloverExportJob> = {}): CloverExportJob {
  return { id: "queue", order_id: orderId, restaurant_id: "restaurant", merchant_id: "merchant", environment: "sandbox", order_type_id: "PICKUP",
    snapshot: snapshot(), status: "queued", clover_order_id: null, send_intent_at: null, cancel_intent_at: null, cancel_requested: false, lease_id: "lease", ...overrides };
}
function fixture() {
  const remote = { id: "REMOTE", title: cloverOrderReference(orderId), currency: "CAD", total: 2300, state: "open", paymentState: "OPEN", payments: { elements: [] } };
  const api = { product: vi.fn().mockResolvedValue(products[0]), checkout: vi.fn().mockResolvedValue({ subtotal: 2000, totalTaxAmount: 300, total: 2300 }),
    create: vi.fn().mockResolvedValue(remote), order: vi.fn().mockResolvedValue(remote), find: vi.fn().mockResolvedValue([remote]),
    showInRegister: vi.fn().mockResolvedValue(remote), deleteUnpaidOrder: vi.fn().mockResolvedValue(undefined), employeeName: vi.fn().mockResolvedValue("Alex") };
  const store = { mappings: vi.fn().mockResolvedValue(mappings), begin: vi.fn().mockResolvedValue(true), remember: vi.fn().mockResolvedValue(undefined), finish: vi.fn().mockResolvedValue(undefined),
    cancellationEnabled: vi.fn().mockResolvedValue(true), employeeEnabled: vi.fn().mockResolvedValue(true), employee: vi.fn().mockResolvedValue(undefined), cancelIntent: vi.fn().mockResolvedValue(true) };
  return { api, store, remote };
}
beforeEach(() => vi.restoreAllMocks());

describe("Clover atomic-order amounts and catalogue", () => {
  it("retains formats, line notes, quantities and the local reference without a payment", () => {
    const payload = buildCloverAtomicPayload(snapshot(), "PICKUP", mappings, products);
    expect(payload.orderCart.lineItems).toHaveLength(2);
    expect(payload.orderCart.lineItems[0]).toEqual({ item: { id: "ITEM" }, name: "Repas", price: 900, note: "Petit\nSans sel", modifications: [{ modifier: { id: "MOD" }, amount: 100 }] });
    expect(payload.orderCart.note).toBe(`Minerva Flow:${orderId}\nRetrait à 18 h`);
    expect(JSON.stringify(payload)).not.toMatch(/payments|paid|unitQty/);
  });
  it("never guesses a format mapping from a base product", () => {
    expect(() => buildCloverAtomicPayload(snapshot(), "PICKUP", [{ ...mappings[0], price_option_id: "" }], products)).toThrow("product_mapping_required");
  });
  it("rejects changed catalogue prices", () => {
    expect(() => buildCloverAtomicPayload(snapshot(), "PICKUP", mappings, [{ ...products[0], price: 901 }])).toThrow("catalog_price_mismatch");
  });
  it("rejects modifiers outside the item's associated groups", () => {
    expect(() => buildCloverAtomicPayload(snapshot(), "PICKUP", mappings, [{ ...products[0], modifiers: [] }])).toThrow("modifier_mapping_required");
  });
  it("rejects duplicate modifiers", () => {
    expect(() => buildCloverAtomicPayload(snapshot(), "PICKUP", [{ ...mappings[0], modifier_ids: ["MOD", "MOD"] }], products)).toThrow("duplicate_modifier");
  });
  it.each(["en_attente", "paye", "echoue"])("does not export online-payment mode %s as pay-at-pickup", status => {
    expect(() => buildCloverAtomicPayload({ ...snapshot(), payment_status: status }, "PICKUP", mappings, products)).toThrow("unsupported_payment_mode");
  });
  it.each([NaN, Infinity, -1, 1.001])("rejects invalid money %s", value => expect(() => cents(value)).toThrow("invalid_money"));
  it("accepts normal decimal rounding without losing a cent", () => expect(cents(14.25)).toBe(1425));
  it("blocks unrepresented tips and delivery fees", () => {
    expect(() => buildCloverAtomicPayload({ ...snapshot(), tip_amount: 1 }, "PICKUP", mappings, products)).toThrow("unsupported_fee_or_tip");
    expect(() => buildCloverAtomicPayload({ ...snapshot(), delivery_fee: 1 }, "PICKUP", mappings, products)).toThrow("unsupported_fee_or_tip");
  });
  it("blocks mismatched server totals", () => {
    expect(() => buildCloverAtomicPayload({ ...snapshot(), total: 24 }, "PICKUP", mappings, products)).toThrow("order_amount_mismatch");
  });
  it.each([{ subtotal: 2000, totalTaxAmount: 301, total: 2300 }, { subtotal: 2001, totalTaxAmount: 300, total: 2300 }, { subtotal: 2000, totalTaxAmount: 300, total: 2301 }, {}])("requires all exact Clover preview amounts", checkout => {
    expect(() => assertCloverCheckoutAmounts(snapshot(), checkout)).toThrow("clover_checkout_amount_mismatch");
  });
  it("recognizes only an exact durable reference, not arbitrary customer text", () => {
    expect(parseCloverOrderReference(undefined, `Minerva Flow:${orderId}\nNote`)).toBe(orderId);
    expect(parseCloverOrderReference(undefined, `Note\nMinerva Flow:${orderId}`)).toBeNull();
  });
});

describe("Clover export send intent and reconciliation", () => {
  it("checks out before persisting intent and creating once", async () => {
    const { api, store } = fixture();
    await processCloverOrderJob(job(), api, store);
    expect(api.checkout.mock.invocationCallOrder[0]).toBeLessThan(store.begin.mock.invocationCallOrder[0]);
    expect(store.begin.mock.invocationCallOrder[0]).toBeLessThan(api.create.mock.invocationCallOrder[0]);
    expect(store.remember).toHaveBeenCalledWith("REMOTE");
    expect(store.finish).toHaveBeenLastCalledWith("exported", "REMOTE");
  });
  it("never sends after a tax mismatch", async () => {
    const { api, store } = fixture(); api.checkout.mockResolvedValue({ subtotal: 2000, totalTaxAmount: 301, total: 2301 });
    await processCloverOrderJob(job(), api, store);
    expect(api.create).not.toHaveBeenCalled(); expect(store.begin).not.toHaveBeenCalled();
    expect(store.finish).toHaveBeenCalledWith("blocked", undefined, "clover_checkout_amount_mismatch");
  });
  it("never sends after another worker's lease wins", async () => {
    const { api, store } = fixture(); store.begin.mockResolvedValue(false);
    await processCloverOrderJob(job(), api, store); expect(api.create).not.toHaveBeenCalled();
  });
  it("reconciles a lost creation reply without a second create", async () => {
    const { api, store } = fixture(); api.create.mockRejectedValueOnce(new Error("response lost"));
    await processCloverOrderJob(job(), api, store);
    expect(store.finish).toHaveBeenCalledWith("verify", undefined, "clover_network_or_storage_error");
    await processCloverOrderJob(job({ status: "verify", send_intent_at: "2026-10-09T12:05:00Z" }), api, store);
    expect(api.create).toHaveBeenCalledTimes(1); expect(api.find).toHaveBeenCalledTimes(1);
    expect(store.finish).toHaveBeenLastCalledWith("exported", "REMOTE");
  });
  it("keeps a missing or incomplete search uncertain rather than recreating", async () => {
    const { api, store } = fixture(); api.find.mockResolvedValue([]);
    await processCloverOrderJob(job({ status: "verify", send_intent_at: "2026-10-09T12:05:00Z" }), api, store);
    expect(api.create).not.toHaveBeenCalled(); expect(store.finish).toHaveBeenCalledWith("verify", undefined, "transmission_to_verify");
  });
  it("does not choose between duplicate remote associations", async () => {
    const { api, store, remote } = fixture(); api.find.mockResolvedValue([remote, { ...remote, id: "OTHER" }]);
    await processCloverOrderJob(job({ status: "verify", send_intent_at: "2026-10-09T12:05:00Z" }), api, store);
    expect(api.create).not.toHaveBeenCalled(); expect(store.finish).toHaveBeenCalledWith("verify", undefined, "multiple_remote_matches");
  });
  it("keeps an existing remote ID through a local persistence failure", async () => {
    const { api, store } = fixture(); store.remember.mockRejectedValueOnce(new Error("database lost"));
    await processCloverOrderJob(job(), api, store);
    expect(store.finish).toHaveBeenCalledWith("verify", "REMOTE", "clover_network_or_storage_error");
  });
  it("does not recreate when GET of a known order returns 404", async () => {
    const { api, store } = fixture(); api.order.mockResolvedValue(null);
    await processCloverOrderJob(job({ status: "verify", clover_order_id: "REMOTE", send_intent_at: "2026-10-09T12:05:00Z" }), api, store);
    expect(api.create).not.toHaveBeenCalled(); expect(store.finish).toHaveBeenCalledWith("verify", "REMOTE", "remote_order_not_found");
  });
  it("does not call an order exported if its remote total differs", async () => {
    const { api, store, remote } = fixture(); api.order.mockResolvedValue({ ...remote, total: 2301 });
    await processCloverOrderJob(job(), api, store);
    expect(store.finish).toHaveBeenCalledWith("verify", "REMOTE", "remote_order_mismatch");
  });
  it("reads only the employee associated with this order", async () => {
    const { api, store, remote } = fixture(); api.order.mockResolvedValue({ ...remote, employee: { id: "EMP" } });
    await processCloverOrderJob(job(), api, store);
    expect(api.employeeName).toHaveBeenCalledWith("EMP"); expect(store.employee).toHaveBeenCalledWith("EMP", "Alex");
  });
  it("preserves a cancellation before sending without creating any order", async () => {
    const { api, store } = fixture(); await processCloverOrderJob(job({ cancel_requested: true }), api, store);
    expect(api.create).not.toHaveBeenCalled(); expect(store.finish).toHaveBeenCalledWith("cancelled");
  });
  it("does not delete a remotely paid order or trigger a refund", async () => {
    const { api, store, remote } = fixture(); api.order.mockResolvedValue({ ...remote, paymentState: "PAID" });
    await processCloverOrderJob(job({ cancel_requested: true, clover_order_id: "REMOTE", send_intent_at: "2026-10-09T12:05:00Z" }), api, store);
    expect(api.deleteUnpaidOrder).not.toHaveBeenCalled(); expect(store.finish).toHaveBeenCalledWith("blocked", "REMOTE", "cancellation_requires_payment_review");
  });
  it("requires sandbox cancellation validation before a DELETE", async () => {
    const { api, store } = fixture(); store.cancellationEnabled.mockResolvedValue(false);
    await processCloverOrderJob(job({ cancel_requested: true, clover_order_id: "REMOTE", send_intent_at: "2026-10-09T12:05:00Z" }), api, store);
    expect(api.deleteUnpaidOrder).not.toHaveBeenCalled(); expect(store.finish).toHaveBeenCalledWith("cancel_pending", "REMOTE", "cancellation_not_validated");
  });
  it("does not replay DELETE after a lost cancellation reply", async () => {
    const { api, store } = fixture(); api.deleteUnpaidOrder.mockRejectedValueOnce(new Error("response lost"));
    const cancelJob = job({ cancel_requested: true, clover_order_id: "REMOTE", send_intent_at: "2026-10-09T12:05:00Z" });
    await processCloverOrderJob(cancelJob, api, store);
    expect(store.finish).toHaveBeenLastCalledWith("cancel_verify", "REMOTE", "clover_network_or_storage_error");
    api.order.mockResolvedValue(null);
    await processCloverOrderJob({ ...cancelJob, cancel_intent_at: "2026-10-09T12:10:00Z" }, api, store);
    expect(api.deleteUnpaidOrder).toHaveBeenCalledTimes(1); expect(store.finish).toHaveBeenLastCalledWith("cancelled", "REMOTE", undefined);
  });
});

import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mockFrom }) }));
import { excludeCloverExportedTickets } from "../clover-import-dedup";
import type { PosTicket } from "../ticket-ingestion";

function ticket(id: string, localId?: string): PosTicket {
  return { externalOrderId: id, closedAt: "2026-10-09T12:00:00Z", subtotal: 20, total: 23, lineItems: [],
    clover: { merchantId: "MERCHANT", environment: "sandbox", ...(localId ? { minervaOrderId: localId } : {}) } };
}
function setup(rows: { order_id: string; clover_order_id: string | null }[], error: unknown = null) {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  query.in.mockImplementation(async (column: "order_id" | "clover_order_id", ids: string[]) => ({ data: rows.filter(r => r[column] && ids.includes(r[column]!)), error }));
  mockFrom.mockReturnValue(query);
  return query;
}
describe("Clover import excludes Minerva exports before side effects", () => {
  it("excludes the exported ID while retaining genuine register sales", async () => {
    const query = setup([{ order_id: "LOCAL", clover_order_id: "EXPORT" }]);
    const result = await excludeCloverExportedTickets("restaurant", [ticket("EXPORT"), ticket("REGISTER")]);
    expect(result.map(t => t.externalOrderId)).toEqual(["REGISTER"]);
    expect(query.eq).toHaveBeenCalledWith("restaurant_id", "restaurant");
    expect(query.eq).toHaveBeenCalledWith("merchant_id", "MERCHANT");
    expect(query.eq).toHaveBeenCalledWith("environment", "sandbox");
  });
  it("recognizes the local reference when the creation response was lost", async () => {
    setup([{ order_id: "LOCAL", clover_order_id: null }]);
    expect(await excludeCloverExportedTickets("restaurant", [ticket("REMOTE", "LOCAL")])).toEqual([]);
  });
  it("does not discard an unrelated reference", async () => {
    setup([{ order_id: "LOCAL", clover_order_id: "EXPORT" }]);
    expect(await excludeCloverExportedTickets("restaurant", [ticket("REGISTER", "UNRELATED")])).toHaveLength(1);
  });
  it("fails closed if the durable mapping cannot be read", async () => {
    setup([], { code: "network_error" });
    await expect(excludeCloverExportedTickets("restaurant", [ticket("EXPORT")])).rejects.toThrow("clover_export_mapping_read_failed");
  });
  it("fails closed if the reference lookup fails", async () => {
    const query = setup([]); query.in.mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: null, error: { code: "network_error" } });
    await expect(excludeCloverExportedTickets("restaurant", [ticket("EXPORT", "LOCAL")])).rejects.toThrow("clover_export_reference_read_failed");
  });
  it("does not trust a ticket without a merchant and environment", async () => {
    await expect(excludeCloverExportedTickets("restaurant", [{ ...ticket("EXPORT"), clover: undefined }])).rejects.toThrow("clover_ticket_scope_missing");
  });
  it("updates employee attribution on the original order without importing another sale", async () => {
    const query = setup([{ order_id: "LOCAL", clover_order_id: "EXPORT" }]);
    const update = vi.fn(); const updated = { eq: vi.fn() };
    updated.eq.mockReturnValueOnce(updated).mockResolvedValue({ error: null });
    update.mockReturnValue(updated);
    mockFrom.mockImplementation(table => table === "orders" ? { update } : query);
    const result = await excludeCloverExportedTickets("restaurant", [{ ...ticket("EXPORT"), posEmployeeId: "EMP", posEmployeeName: "Alex" }]);
    expect(result).toEqual([]); expect(update).toHaveBeenCalledWith({ clover_employee_id: "EMP", clover_employee_name: "Alex" });
    expect(updated.eq).toHaveBeenCalledWith("restaurant_id", "restaurant"); expect(updated.eq).toHaveBeenCalledWith("id", "LOCAL");
  });
});

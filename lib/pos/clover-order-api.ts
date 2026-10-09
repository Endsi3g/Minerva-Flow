import "server-only";
import { cloverApiBaseUrl } from "./config";
import type { CloverAtomicPayload, CloverCatalogProduct } from "./clover-order-contract";

export type CloverRemoteOrder = {
  id?: string;
  title?: string;
  note?: string;
  currency?: string;
  total?: number;
  state?: string;
  paymentState?: string;
  deletedTimestamp?: number;
  employee?: { id?: string };
  payments?: { elements?: unknown[] } | unknown[];
  lineItems?: { elements?: { item?: { id?: string }; price?: number; note?: string }[] };
};
export class CloverOrderApiError extends Error {
  constructor(public readonly code: string) { super(code); }
}
/** No automatic retry of any write. Orders do not inherit payment idempotency. */
export class CloverOrderApi {
  private readonly deadline = Date.now() + 120_000;
  constructor(private readonly accessToken: string, private readonly merchantId: string) {}
  private async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const remaining = this.deadline - Date.now();
    if (remaining <= 0) throw new CloverOrderApiError("clover_request_budget_exhausted");
    const response = await fetch(`${cloverApiBaseUrl()}/v3/merchants/${encodeURIComponent(this.merchantId)}${path}`, {
      method, cache: "no-store", signal: AbortSignal.timeout(Math.min(15_000, remaining)),
      headers: { Authorization: `Bearer ${this.accessToken}`, Accept: "application/json", "Content-Type": "application/json", "User-Agent": "MinervaFlow/2.51.1 (Minerva Technologies Inc.)" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new CloverOrderApiError(`clover_http_${response.status}`);
    if (method === "DELETE") return undefined as T;
    return response.json() as Promise<T>;
  }
  async product(id: string): Promise<CloverCatalogProduct> {
    const item = await this.request<{ id: string; price: number; priceType: string; hidden?: boolean; deleted?: boolean; modifierGroups?: { elements?: { id: string }[] } }>(`/items/${encodeURIComponent(id)}?expand=modifierGroups`);
    const groups = item.modifierGroups?.elements ?? [];
    if (groups.length > 10) throw new CloverOrderApiError("too_many_modifier_groups");
    const modifiers: CloverCatalogProduct["modifiers"] = [];
    for (const group of groups) {
      const data = await this.request<{ elements?: { id: string; price: number }[] }>(`/modifier_groups/${encodeURIComponent(group.id)}/modifiers?limit=100`);
      if (!Array.isArray(data.elements) || data.elements.length >= 100) throw new CloverOrderApiError("modifier_catalog_incomplete");
      modifiers.push(...data.elements.map(m => ({ id: m.id, amount: m.price })));
    }
    return { ...item, modifiers };
  }
  checkout(payload: CloverAtomicPayload) {
    return this.request<{ subtotal?: number; totalTaxAmount?: number; total?: number; isVat?: boolean }>("/atomic_order/checkouts", "POST", payload);
  }
  orderType(id: string) { return this.request<{ id?: string; isHidden?: boolean; isDeleted?: boolean }>(`/order_types/${encodeURIComponent(id)}`); }
  create(payload: CloverAtomicPayload) { return this.request<CloverRemoteOrder>("/atomic_order/orders", "POST", payload); }
  async order(id: string): Promise<CloverRemoteOrder | null> {
    try { return await this.request<CloverRemoteOrder>(`/orders/${encodeURIComponent(id)}?expand=lineItems,payments`); }
    catch (error) { if (error instanceof CloverOrderApiError && error.code === "clover_http_404") return null; throw error; }
  }
  async find(reference: string, since: number): Promise<CloverRemoteOrder[]> {
    const matches: CloverRemoteOrder[] = [];
    // Bounded scans may return no match; that never authorizes another POST.
    for (let page = 0; page < 5; page++) {
      const params = new URLSearchParams({ filter: `createdTime>=${since}`, limit: "100", offset: String(page * 100) });
      const data = await this.request<{ elements?: CloverRemoteOrder[] }>(`/orders?${params}`);
      if (!Array.isArray(data.elements)) throw new CloverOrderApiError("invalid_order_search");
      matches.push(...data.elements.filter(o => o.title === reference || o.note?.split("\n")[0] === reference));
      if (data.elements.length < 100) break;
    }
    return matches;
  }
  showInRegister(id: string) { return this.request<CloverRemoteOrder>(`/orders/${encodeURIComponent(id)}`, "POST", { state: "open" }); }
  deleteUnpaidOrder(id: string) { return this.request<void>(`/orders/${encodeURIComponent(id)}`, "DELETE"); }
  async employeeName(id: string): Promise<string | null> {
    const employee = await this.request<{ id?: string; name?: string }>(`/employees/${encodeURIComponent(id)}`);
    return employee.id === id && typeof employee.name === "string" ? employee.name.slice(0, 160) : null;
  }
}

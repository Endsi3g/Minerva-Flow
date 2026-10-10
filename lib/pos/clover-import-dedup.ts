import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PosTicket } from "./ticket-ingestion";

/** Exclude local exports BEFORE customer, loyalty, stock or revenue effects.
 * A title/note reference also covers a lost creation reply before its ID was saved.
 * If the mapping cannot be read, fail closed instead of importing duplicates.
 */
export async function excludeCloverExportedTickets(restaurantId: string, tickets: PosTicket[]): Promise<PosTicket[]> {
  if (!tickets.length) return [];
  if (tickets.some(t => !t.clover?.merchantId || !t.clover.environment)) throw new Error("clover_ticket_scope_missing");
  const admin = createAdminClient();
  const groups = new Map<string, PosTicket[]>();
  for (const ticket of tickets) {
    const key = `${ticket.clover!.environment}:${ticket.clover!.merchantId}`;
    groups.set(key, [...(groups.get(key) ?? []), ticket]);
  }
  const eligible: PosTicket[] = [];
  for (const group of groups.values()) {
    const scope = group[0].clover!;
    // Batch reads avoid per-ticket round trips and remain scoped to the merchant.
    for (let offset = 0; offset < group.length; offset += 100) {
      const batch = group.slice(offset, offset + 100);
      const query = () => admin.from("clover_order_exports").select("order_id,clover_order_id")
        .eq("restaurant_id",restaurantId).eq("merchant_id",scope.merchantId).eq("environment",scope.environment);
      const byId = await query().in("clover_order_id", batch.map(t => t.externalOrderId));
      if (byId.error) throw new Error("clover_export_mapping_read_failed");
      const localIds = batch.flatMap(t => t.clover?.minervaOrderId ? [t.clover.minervaOrderId] : []);
      const byReference = localIds.length ? await query().in("order_id",localIds) : { data: [], error: null };
      if (byReference.error) throw new Error("clover_export_reference_read_failed");
      const mapped = [...(byId.data ?? []), ...(byReference.data ?? [])] as { order_id: string; clover_order_id: string | null }[];
      const remoteIds = new Set(mapped.map(m => m.clover_order_id));
      const originalIds = new Set(mapped.map(m => m.order_id));
      for (const ticket of batch) {
        if (!ticket.posEmployeeId || !ticket.posEmployeeName) continue;
        const original = mapped.find(m => m.clover_order_id === ticket.externalOrderId || m.order_id === ticket.clover?.minervaOrderId);
        if (!original) continue;
        const result = await admin.from("orders").update({ clover_employee_id: ticket.posEmployeeId, clover_employee_name: ticket.posEmployeeName })
          .eq("restaurant_id",restaurantId).eq("id",original.order_id);
        if (result.error) throw new Error("clover_employee_attribution_failed");
      }
      eligible.push(...batch.filter(t => !remoteIds.has(t.externalOrderId) && !originalIds.has(t.clover?.minervaOrderId ?? "")));
    }
  }
  return eligible;
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidCloverAccessToken } from "./clover";
import { cloverEnvironment } from "./config";
import { CloverOrderApi, type CloverRemoteOrder } from "./clover-order-api";
import { assertCloverCheckoutAmounts, buildCloverAtomicPayload, cents, cloverOrderReference, CloverOrderValidationError, type CloverOrderMapping, type CloverOrderSnapshot } from "./clover-order-contract";

export type CloverExportJob = {
  id: string; order_id: string; restaurant_id: string; merchant_id: string;
  environment: string; order_type_id: string; snapshot: CloverOrderSnapshot;
  status: string; clover_order_id: string | null; send_intent_at: string | null;
  cancel_intent_at: string | null; cancel_requested: boolean; lease_id: string;
};
type ExportStatus = "queued" | "verify" | "exported" | "blocked" | "cancel_pending" | "cancel_verify" | "cancelled";
type WorkerStore = {
  finish(status: ExportStatus, remoteId?: string, error?: string): Promise<void>;
  mappings(): Promise<CloverOrderMapping[]>;
  begin(payload: ReturnType<typeof buildCloverAtomicPayload>): Promise<boolean>;
  remember(remoteId: string): Promise<void>;
  cancellationEnabled(): Promise<boolean>;
  employeeEnabled(): Promise<boolean>;
  employee(id: string, name: string): Promise<void>;
  cancelIntent(): Promise<boolean>;
};
type WorkerApi = Pick<CloverOrderApi, "product" | "checkout" | "create" | "order" | "find" | "showInRegister" | "deleteUnpaidOrder" | "employeeName">;

function verifyRemote(job: CloverExportJob, remote: CloverRemoteOrder) {
  const ref = cloverOrderReference(job.order_id);
  if (!remote.id || (remote.title !== ref && remote.note?.split("\n")[0] !== ref)
    || remote.currency !== "CAD" || remote.total !== cents(job.snapshot.total)) {
    throw new CloverOrderValidationError("remote_order_mismatch");
  }
}
/** Independent of Next/Supabase so ambiguity and concurrent leases can be tested. */
export async function processCloverOrderJob(job: CloverExportJob, api: WorkerApi, store: WorkerStore): Promise<void> {
  let intent = Boolean(job.send_intent_at);
  let cancelIntent = Boolean(job.cancel_intent_at);
  let remoteId = job.clover_order_id ?? undefined;
  try {
    if (job.cancel_requested && !intent) { await store.finish("cancelled"); return; }
    if (!intent) {
      const mappings = await store.mappings();
      const ids = [...new Set(mappings.filter(m => job.snapshot.items.some(i => i.menu_item_id === m.menu_item_id && (i.price_option_id ?? "") === m.price_option_id)).map(m => m.clover_item_id))];
      if (ids.length > 20) throw new CloverOrderValidationError("too_many_distinct_products");
      const products = await Promise.all(ids.map(id => api.product(id)));
      const payload = buildCloverAtomicPayload(job.snapshot, job.order_type_id, mappings, products);
      assertCloverCheckoutAmounts(job.snapshot, await api.checkout(payload));
      // CAS refuses a stale lease, cancellation or any previous send intent.
      if (!await store.begin(payload)) return;
      intent = true;
      const created = await api.create(payload);
      if (!created.id) throw new CloverOrderValidationError("missing_remote_order_id");
      remoteId = created.id;
      await store.remember(remoteId);
    }
    if (!remoteId) {
      const candidates = await api.find(cloverOrderReference(job.order_id), Date.parse(job.send_intent_at ?? job.snapshot.created_at) - 300_000);
      if (candidates.length !== 1 || !candidates[0].id) {
        await store.finish("verify", undefined, candidates.length > 1 ? "multiple_remote_matches" : "transmission_to_verify");
        return;
      }
      remoteId = candidates[0].id;
      verifyRemote(job, candidates[0]);
      await store.remember(remoteId);
    }
    const remote = await api.order(remoteId);
    if (!remote) {
      // Absence (even a 404) never proves that a lost creation failed.
      await store.finish(cancelIntent ? "cancelled" : "verify", remoteId, cancelIntent ? undefined : "remote_order_not_found");
      return;
    }
    verifyRemote(job, remote);
    if (job.cancel_requested || job.status === "cancel_pending" || job.status === "cancel_verify") {
      if (remote.deletedTimestamp || remote.state === "deleted") { await store.finish("cancelled", remoteId); return; }
      if (!await store.cancellationEnabled()) { await store.finish("cancel_pending", remoteId, "cancellation_not_validated"); return; }
      const payments = Array.isArray(remote.payments) ? remote.payments : remote.payments?.elements;
      if (remote.paymentState !== "OPEN" || remote.state !== "open" || !Array.isArray(payments) || payments.length) {
        await store.finish("blocked", remoteId, "cancellation_requires_payment_review"); return;
      }
      // Persist DELETE intent too. A lost reply is reconciled, never blindly replayed.
      if (job.cancel_intent_at) { await store.finish("cancel_verify", remoteId, "cancellation_to_verify"); return; }
      if (!await store.cancelIntent()) return;
      cancelIntent = true;
      await api.deleteUnpaidOrder(remoteId);
      const after = await api.order(remoteId);
      await store.finish(!after || after.deletedTimestamp || after.state === "deleted" ? "cancelled" : "cancel_verify", remoteId);
      return;
    }
    if (!remote.deletedTimestamp && remote.state !== "deleted") {
      if (!remote.state) {
        await api.showInRegister(remoteId);
        const visible = await api.order(remoteId);
        if (!visible || visible.state !== "open") { await store.finish("verify", remoteId, "register_visibility_to_verify"); return; }
        verifyRemote(job, visible);
      } else if (!["open", "locked"].includes(remote.state)) {
        await store.finish("verify", remoteId, "unexpected_remote_state"); return;
      }
      if (remote.employee?.id && await store.employeeEnabled()) {
        const name = await api.employeeName(remote.employee.id);
        if (name) await store.employee(remote.employee.id, name);
      }
      await store.finish("exported", remoteId);
    } else await store.finish("verify", remoteId, "remote_order_deleted");
  } catch (error) {
    const code = error instanceof CloverOrderValidationError || (error instanceof Error && "code" in error && typeof error.code === "string") ? (error as { code: string }).code : "clover_network_or_storage_error";
    // A failed creation response, JSON parse or local persistence is ambiguous.
    // No exception after intent permits moving this job back to queued.
    await store.finish(cancelIntent ? "cancel_verify" : intent ? "verify" : error instanceof CloverOrderValidationError ? "blocked" : "queued", remoteId, code);
  }
}

export async function runCloverOrderExport(): Promise<{ claimed: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_clover_order_export", { p_environment: cloverEnvironment() });
  if (error) throw new Error("clover_queue_claim_failed");
  const candidate = (data as CloverExportJob[] | null)?.[0];
  if (!candidate) return { claimed: false };
  const job: CloverExportJob = candidate;
  async function rpc(name: string, args: Record<string, unknown>) {
    const result = await admin.rpc(name, { p_id: job.id, p_lease: job.lease_id, ...args });
    if (result.error) throw new Error("clover_queue_persistence_failed");
    return result.data;
  }
  const store: WorkerStore = {
    async finish(status, id, code) { await rpc("finish_clover_order_export", { p_status: status, p_clover_id: id ?? null, p_error: code ?? null }); },
    async mappings() {
      const result = await admin.from("clover_order_item_mappings").select("menu_item_id,price_option_id,clover_item_id,modifier_ids")
        .eq("restaurant_id", job.restaurant_id).eq("merchant_id", job.merchant_id).eq("environment", job.environment);
      if (result.error) throw new Error("clover_mapping_read_failed");
      return result.data as CloverOrderMapping[];
    },
    async begin(payload) { return await rpc("begin_clover_order_send", { p_payload: payload }) === true; },
    async remember(id) { if (await rpc("remember_clover_order_id", { p_clover_id: id }) !== true) throw new Error("clover_queue_lease_lost"); },
    async cancellationEnabled() {
      if (process.env.CLOVER_AUTOMATIC_CANCELLATION_VALIDATED !== "1") return false;
      const result = await admin.from("clover_order_settings").select("automatic_cancellation").eq("restaurant_id",job.restaurant_id).eq("merchant_id",job.merchant_id).eq("environment",job.environment).maybeSingle();
      return !result.error && result.data?.automatic_cancellation === true;
    },
    async employeeEnabled() {
      const result = await admin.from("clover_order_settings").select("employee_attribution").eq("restaurant_id",job.restaurant_id).eq("merchant_id",job.merchant_id).eq("environment",job.environment).maybeSingle();
      return !result.error && result.data?.employee_attribution === true;
    },
    async employee(id, name) {
      const result = await admin.from("orders").update({ clover_employee_id: id, clover_employee_name: name }).eq("restaurant_id",job.restaurant_id).eq("id",job.order_id);
      if (result.error) throw new Error("clover_employee_persistence_failed");
    },
    async cancelIntent() { return await rpc("begin_clover_order_cancel", {}) === true; },
  };
  const token = await getValidCloverAccessToken(job.restaurant_id);
  if (!token || token.merchantId !== job.merchant_id || job.environment !== cloverEnvironment()) {
    await store.finish(job.send_intent_at ? "verify" : "queued", undefined, "merchant_connection_unavailable");
    return { claimed: true };
  }
  await processCloverOrderJob(job, new CloverOrderApi(token.accessToken, job.merchant_id), store);
  return { claimed: true };
}

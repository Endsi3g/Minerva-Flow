import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/data/activity";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Alert, AlertRule, AlertRuleType, AlertSeverity } from "@/lib/types";

type AlertRow = {
  id: string;
  restaurant_id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  status: "nouvelle" | "revue" | "assignee";
  assigned_to: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
};

function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    severity: row.severity,
    date: row.created_at.slice(0, 10),
    restaurantId: row.restaurant_id,
    type: row.type,
    status: row.status,
    assignedTo: row.assigned_to,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
  };
}

export async function getAlerts(restaurantId: string): Promise<Alert[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as AlertRow[]).map(mapAlert);
}

export async function updateAlertStatus(
  restaurantId: string,
  id: string,
  status: "nouvelle" | "revue" | "assignee",
  assignedTo?: string | null
): Promise<Alert | null> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = { status };
  if (assignedTo !== undefined) dbPatch.assigned_to = assignedTo;

  const { data, error } = await supabase
    .from("alerts")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "alert.update_status",
    entityType: "alert",
    entityId: id,
    description: `A marqué une alerte comme "${status}"`,
  });

  return mapAlert(data as AlertRow);
}

/** Marks every "nouvelle" alert for this restaurant as "revue" (bulk "tout marquer lu"). */
export async function markAllAlertsReviewed(restaurantId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alerts")
    .update({ status: "revue" })
    .eq("restaurant_id", restaurantId)
    .eq("status", "nouvelle")
    .select("id");

  if (error || !data || data.length === 0) return;

  await logActivity({
    restaurantId,
    actionType: "alert.bulk_review",
    description: `A marqué ${data.length} alerte${data.length > 1 ? "s" : ""} comme revue${data.length > 1 ? "s" : ""}`,
  });
}

// alert_rules only persists id/threshold/enabled/notify per rule_type — the
// label/description/unit shown in Settings are stable per rule type, so
// they live here rather than in the database.
const RULE_META: Record<
  AlertRuleType,
  { label: string; description: string; defaultThreshold: number; unit: "%" | "jours" | "count" }
> = {
  revenue_drop: {
    label: "Baisse de revenu",
    description:
      "Alerter quand le revenu d'un jour tombe sous ce pourcentage de la moyenne du même jour de semaine.",
    defaultThreshold: 30,
    unit: "%",
  },
  expense_spike: {
    label: "Pic de dépense",
    description:
      "Alerter quand une catégorie de dépense dépasse ce pourcentage au-dessus de sa moyenne mensuelle.",
    defaultThreshold: 25,
    unit: "%",
  },
  missing_day_input: {
    label: "Journée sans saisie",
    description:
      "Alerter quand une journée de service n'a pas été renseignée après ce délai.",
    defaultThreshold: 2,
    unit: "jours",
  },
  broken_sync: {
    label: "Synchronisation rompue",
    description:
      "Alerter quand une intégration connectée échoue à se synchroniser depuis ce nombre de jours.",
    defaultThreshold: 1,
    unit: "jours",
  },
  reservation_anomaly: {
    label: "Anomalie de réservation",
    description:
      "Alerter en cas de variation inhabituelle du nombre de réservations sur une journée.",
    defaultThreshold: 40,
    unit: "%",
  },
  low_stock: {
    label: "Stock bas",
    description:
      "Alerter quand un article d'inventaire tombe à ce pourcentage (ou moins) de son seuil minimal.",
    defaultThreshold: 100,
    unit: "%",
  },
  unfilled_shift: {
    label: "Quart non confirmé",
    description:
      "Alerter quand un quart de travail approche sans avoir été confirmé par l'employé, sous ce délai (en jours).",
    defaultThreshold: 2,
    unit: "jours",
  },
  late_supplier_order: {
    label: "Commande fournisseur en retard",
    description:
      "Alerter quand une commande envoyée à un fournisseur dépasse sa date de livraison prévue.",
    defaultThreshold: 0,
    unit: "jours",
  },
};

type AlertRuleRow = {
  id: string;
  restaurant_id: string;
  rule_type: AlertRuleType;
  threshold: number;
  enabled: boolean;
  notify: boolean;
};

export async function getAlertRules(restaurantId: string, client?: SupabaseClient): Promise<AlertRule[]> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("restaurant_id", restaurantId);

  const rows = new Map(((data as AlertRuleRow[]) ?? []).map((r) => [r.rule_type, r]));

  return (Object.keys(RULE_META) as AlertRuleType[]).map((type) => {
    const meta = RULE_META[type];
    const row = rows.get(type);
    return {
      id: row?.id ?? `default-${type}`,
      type,
      label: meta.label,
      description: meta.description,
      threshold: row?.threshold ?? meta.defaultThreshold,
      unit: meta.unit,
      enabled: row?.enabled ?? true,
      notify: row?.notify ?? true,
    };
  });
}

export async function upsertAlertRule(
  restaurantId: string,
  type: AlertRuleType,
  patch: { threshold?: number; enabled?: boolean; notify?: boolean }
): Promise<AlertRule | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alert_rules")
    .upsert(
      {
        restaurant_id: restaurantId,
        rule_type: type,
        ...(patch.threshold !== undefined ? { threshold: patch.threshold } : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.notify !== undefined ? { notify: patch.notify } : {}),
      },
      { onConflict: "restaurant_id,rule_type" }
    )
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "alert_rule.update",
    entityType: "alert_rule",
    entityId: data.id,
    description: `A mis à jour la règle d'alerte "${RULE_META[type].label}"`,
  });

  const meta = RULE_META[type];
  const row = data as AlertRuleRow;
  return {
    id: row.id,
    type,
    label: meta.label,
    description: meta.description,
    threshold: row.threshold,
    unit: meta.unit,
    enabled: row.enabled,
    notify: row.notify,
  };
}

// computeAlerts() (lib/engine/alerts.ts) builds deterministic per-alert ids like
// `low-stock-<itemId>` — this recovers the rule type from that prefix so synced rows
// carry a real `type` (used nowhere yet, but matches what a persisted alert should have).
const ALERT_TYPE_PREFIXES: [prefix: string, type: AlertRuleType][] = [
  ["revenue-drop-", "revenue_drop"],
  ["expense-spike-", "expense_spike"],
  ["missing-day-input", "missing_day_input"],
  ["broken-sync-", "broken_sync"],
  ["low-stock-", "low_stock"],
  ["unfilled-shift-", "unfilled_shift"],
  ["late-supplier-order-", "late_supplier_order"],
];

function alertTypeFromComputedKey(key: string): string {
  return ALERT_TYPE_PREFIXES.find(([prefix]) => key.startsWith(prefix))?.[1] ?? "other";
}

/**
 * Persists computeAlerts()'s live output for one restaurant — run periodically
 * (app/api/cron/sync-alerts) since `alerts` is otherwise never written to, which
 * left the notification bell always empty and Overview's own `unreadTableAlerts`
 * merge silently dead. Idempotent: upserts on (restaurant_id, computed_key), so a
 * re-sync of the same underlying condition updates severity/title/detail without
 * resetting `status` (a review a staff member already marked stays marked) or
 * `created_at`. Alerts whose condition no longer holds (key missing from the fresh
 * set) are deleted — this table only ever reflects what's currently true, same as
 * computeAlerts() itself.
 */
export async function syncComputedAlerts(
  restaurantId: string,
  computed: Alert[]
): Promise<{ synced: number; error?: string }> {
  const admin = createAdminClient();

  const { data: existing, error: readError } = await admin
    .from("alerts")
    .select("computed_key")
    .eq("restaurant_id", restaurantId)
    .not("computed_key", "is", null);

  if (readError) {
    console.error("syncComputedAlerts read failed:", readError.message);
    return { synced: 0, error: readError.message };
  }

  const freshKeys = new Set(computed.map((a) => a.id));
  const staleKeys = ((existing as { computed_key: string }[] | null) ?? [])
    .map((r) => r.computed_key)
    .filter((key) => !freshKeys.has(key));

  if (staleKeys.length > 0) {
    const { error: deleteError } = await admin
      .from("alerts")
      .delete()
      .eq("restaurant_id", restaurantId)
      .in("computed_key", staleKeys);
    if (deleteError) console.error("syncComputedAlerts delete failed:", deleteError.message);
  }

  if (computed.length === 0) return { synced: 0 };

  const { error: upsertError } = await admin.from("alerts").upsert(
    computed.map((a) => ({
      restaurant_id: restaurantId,
      computed_key: a.id,
      type: alertTypeFromComputedKey(a.id),
      severity: a.severity,
      title: a.title,
      detail: a.detail,
    })),
    { onConflict: "restaurant_id,computed_key" }
  );

  if (upsertError) {
    console.error("syncComputedAlerts upsert failed:", upsertError.message);
    return { synced: 0, error: upsertError.message };
  }

  return { synced: computed.length };
}

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
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
};

type AlertRuleRow = {
  id: string;
  restaurant_id: string;
  rule_type: AlertRuleType;
  threshold: number;
  enabled: boolean;
  notify: boolean;
};

export async function getAlertRules(restaurantId: string): Promise<AlertRule[]> {
  const supabase = await createClient();
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

import { formatDate } from "@/lib/utils";
import type {
  Alert,
  AlertRule,
  AlertSeverity,
  Connection,
  FinancialTransaction,
  ServiceDay,
} from "@/lib/types";

function dayOfWeek(iso: string) {
  return new Date(iso + "T00:00:00").getDay();
}

function severityFor(pctOver: number): AlertSeverity {
  if (pctOver >= 50) return "critique";
  if (pctOver >= 25) return "important";
  return "info";
}

export type ComputeAlertsInput = {
  serviceDays: ServiceDay[];
  connections: Connection[];
  alertRules: AlertRule[];
  financialTransactions: FinancialTransaction[];
};

/**
 * Rule-based alert engine. Scans the current data against the restaurant's
 * configured alert_rules and produces Alert objects — no LLM involved, this
 * runs entirely deterministically so alerts stay explainable and free.
 */
export function computeAlerts({
  serviceDays,
  connections,
  alertRules,
  financialTransactions,
}: ComputeAlertsInput): Alert[] {
  const rules = Object.fromEntries(alertRules.map((r) => [r.type, r]));
  const alerts: Alert[] = [];

  // 1. Revenue drop — compare each day to the average of the same weekday.
  const revRule = rules["revenue_drop"];
  if (revRule?.enabled) {
    for (const day of serviceDays) {
      const dow = dayOfWeek(day.date);
      const sameWeekday = serviceDays.filter(
        (d) => dayOfWeek(d.date) === dow && d.date !== day.date
      );
      if (sameWeekday.length === 0) continue;
      const avg = sameWeekday.reduce((s, d) => s + d.revenue, 0) / sameWeekday.length;
      const dropPct = ((avg - day.revenue) / avg) * 100;
      if (dropPct >= revRule.threshold) {
        alerts.push({
          id: `revenue-drop-${day.id}`,
          title: "Journée anormalement basse",
          detail: `${formatDate(day.date)} : revenu ${Math.round(dropPct)}% sous la moyenne du même jour de semaine.`,
          severity: severityFor(dropPct),
          date: day.date,
        });
      }
    }
  }

  // 2. Expense spike — flag outflow transactions well above their category's
  //    average transaction size.
  const spikeRule = rules["expense_spike"];
  if (spikeRule?.enabled) {
    const outflowsByCategory = new Map<string, number[]>();
    for (const t of financialTransactions) {
      if (t.direction !== "out") continue;
      const list = outflowsByCategory.get(t.category) ?? [];
      list.push(Math.abs(t.amount));
      outflowsByCategory.set(t.category, list);
    }
    for (const t of financialTransactions) {
      if (t.direction !== "out") continue;
      const list = outflowsByCategory.get(t.category) ?? [];
      const others = list.filter((_, i) => list[i] !== undefined);
      const avg = others.reduce((s, v) => s + v, 0) / (others.length || 1);
      if (avg === 0) continue;
      const overPct = ((Math.abs(t.amount) - avg) / avg) * 100;
      if (overPct >= spikeRule.threshold && list.length > 1) {
        alerts.push({
          id: `expense-spike-${t.id}`,
          title: `Pic de dépense — ${t.category}`,
          detail: `${formatDate(t.date)} : "${t.description}" (${Math.abs(t.amount)} $) dépasse de ${Math.round(overPct)}% la moyenne de cette catégorie.`,
          severity: severityFor(overPct),
          date: t.date,
        });
      }
    }
  }

  // 3. Missing day input — gap between the most recent logged service day
  //    and today beyond the configured threshold.
  const missingRule = rules["missing_day_input"];
  if (missingRule?.enabled && serviceDays.length > 0) {
    const latest = [...serviceDays].sort((a, b) => b.date.localeCompare(a.date))[0];
    const daysSince = Math.floor(
      (Date.now() - new Date(latest.date + "T00:00:00").getTime()) / 86_400_000
    );
    if (daysSince >= missingRule.threshold) {
      alerts.push({
        id: "missing-day-input",
        title: "Journées sans saisie",
        detail: `Aucune journée renseignée depuis ${daysSince} jour${daysSince > 1 ? "s" : ""} (dernière saisie : ${formatDate(latest.date)}).`,
        severity: daysSince >= missingRule.threshold * 2 ? "critique" : "important",
        date: latest.date,
      });
    }
  }

  // 4. Broken sync — connections currently in error status.
  const syncRule = rules["broken_sync"];
  if (syncRule?.enabled) {
    for (const c of connections) {
      if (c.status === "erreur") {
        alerts.push({
          id: `broken-sync-${c.id}`,
          title: `Connexion "${c.name}" en erreur`,
          detail: c.detail ?? "La synchronisation a échoué — reconnectez ce compte.",
          severity: "critique",
          date: new Date().toISOString().slice(0, 10),
        });
      }
    }
  }

  // 5. Reservation anomaly — no distinct reservation-count data source is
  // wired yet (only "réservation" as a service-day main source), so this
  // rule stays configurable in Settings but the engine can't safely compute
  // it without weak/false claims. It will activate once reservation data
  // is connected.

  return alerts.sort((a, b) => b.date.localeCompare(a.date));
}

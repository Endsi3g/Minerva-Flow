import { formatDate } from "@/lib/utils";
import type {
  Alert,
  AlertRule,
  AlertSeverity,
  Connection,
  Employee,
  FinancialTransaction,
  InventoryItem,
  PurchaseOrder,
  ServiceDay,
  ShiftSchedule,
  Supplier,
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
  inventoryItems?: InventoryItem[];
  shiftSchedules?: ShiftSchedule[];
  employees?: Employee[];
  purchaseOrders?: PurchaseOrder[];
  suppliers?: Supplier[];
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
  inventoryItems = [],
  shiftSchedules = [],
  employees = [],
  purchaseOrders = [],
  suppliers = [],
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
          href: "/days",
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
          href: "/finance",
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
        href: "/days",
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
          href: "/settings?tab=integrations",
        });
      }
    }
  }

  // 5. Reservation anomaly — no distinct reservation-count data source is
  // wired yet (only "réservation" as a service-day main source), so this
  // rule stays configurable in Settings but the engine can't safely compute
  // it without weak/false claims. It will activate once reservation data
  // is connected.

  const today = new Date().toISOString().slice(0, 10);

  // 6. Low stock — an inventory item at or below its par level (threshold
  // is a % of par level, so 100 = "at or under par", 50 = "at or under
  // half of par" for restaurants that only want to be warned when it's
  // more urgent).
  const lowStockRule = rules["low_stock"];
  if (lowStockRule?.enabled) {
    for (const item of inventoryItems) {
      if (item.parLevel === null || item.parLevel <= 0) continue;
      const pctOfPar = (item.quantityOnHand / item.parLevel) * 100;
      if (pctOfPar <= lowStockRule.threshold) {
        alerts.push({
          id: `low-stock-${item.id}`,
          title: `Stock bas — ${item.name}`,
          detail: `${item.quantityOnHand} ${item.unit} en stock, sous le seuil de ${item.parLevel} ${item.unit}. Commande fournisseur recommandée.`,
          severity: pctOfPar <= 0 ? "critique" : severityFor(100 - pctOfPar),
          date: today,
          href: "/inventaire",
        });
      }
    }
  }

  // 7. Unfilled shift — a scheduled shift that's still "planifié" (not yet
  // confirmed by the employee) within `threshold` days of starting.
  const unfilledShiftRule = rules["unfilled_shift"];
  if (unfilledShiftRule?.enabled) {
    const employeeName = new Map(employees.map((e) => [e.id, e.fullName]));
    for (const shift of shiftSchedules) {
      if (shift.status !== "planifie") continue;
      const daysUntil = Math.floor(
        (new Date(shift.shiftDate + "T00:00:00").getTime() - Date.now()) / 86_400_000
      );
      if (daysUntil < 0 || daysUntil > unfilledShiftRule.threshold) continue;
      const name = employeeName.get(shift.employeeId) ?? "Un employé";
      alerts.push({
        id: `unfilled-shift-${shift.id}`,
        title: "Quart non confirmé",
        detail: `${name} — ${formatDate(shift.shiftDate)}${shift.positionLabel ? ` (${shift.positionLabel})` : ""}, ${shift.startTime}–${shift.endTime}, pas encore confirmé.`,
        severity: daysUntil === 0 ? "critique" : "important",
        date: shift.shiftDate,
        href: "/collaborateurs",
      });
    }
  }

  // 8. Late supplier order — a purchase order sent to a supplier whose
  // expected delivery date has passed without being marked "reçue".
  const lateSupplierRule = rules["late_supplier_order"];
  if (lateSupplierRule?.enabled) {
    const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
    for (const po of purchaseOrders) {
      if (po.status !== "envoyee" || !po.expectedDate) continue;
      const daysLate = Math.floor(
        (Date.now() - new Date(po.expectedDate + "T00:00:00").getTime()) / 86_400_000
      );
      if (daysLate <= lateSupplierRule.threshold) continue;
      alerts.push({
        id: `late-supplier-order-${po.id}`,
        title: `Commande fournisseur en retard — ${supplierName.get(po.supplierId) ?? "Fournisseur"}`,
        detail: `Livraison attendue le ${formatDate(po.expectedDate)}, ${daysLate} jour${daysLate > 1 ? "s" : ""} de retard.`,
        severity: daysLate >= 3 ? "critique" : "important",
        date: po.expectedDate,
        href: "/fournisseurs",
      });
    }
  }

  return alerts.sort((a, b) => b.date.localeCompare(a.date));
}

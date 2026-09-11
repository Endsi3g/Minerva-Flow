import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateWeekday } from "@/lib/utils";
import type { Anomaly, Employee, FinancialTransaction, RushLevel, ServiceDay, ServiceSource, ShiftSchedule } from "@/lib/types";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  CalendarCheck,
  Users,
  Megaphone,
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

const sourceLabel: Record<ServiceSource, string> = {
  salle: "Sur place",
  livraison: "Livraison",
  reservation: "Réservation",
};

const sourceIcon: Record<ServiceSource, typeof ShoppingBag> = {
  salle: ShoppingBag,
  livraison: Truck,
  reservation: CalendarCheck,
};

const rushLevelLabel: Record<RushLevel, string> = {
  calme: "Calme",
  normal: "Normal",
  rush: "Rush",
  debordement: "Débordement",
};

const anomalyBadge: Record<NonNullable<Anomaly>, { label: string; tone: "amber" | "red" | "green" }> = {
  rush: { label: "Rush", tone: "green" },
  creux: { label: "Creux", tone: "amber" },
  probleme: { label: "Problème", tone: "red" },
};

function calculateShiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let startMinutes = sh * 60 + (sm || 0);
  let endMinutes = eh * 60 + (em || 0);
  if (endMinutes < startMinutes) endMinutes += 24 * 60; // overnight shift
  return Math.max(0, (endMinutes - startMinutes) / 60);
}

export function ServiceDayDetailView({
  day,
  shifts = [],
  employees = [],
  transactions = [],
  prevWeekDay = null,
}: {
  day: ServiceDay;
  shifts?: ShiftSchedule[];
  employees?: Employee[];
  transactions?: FinancialTransaction[];
  prevWeekDay?: ServiceDay | null;
}) {
  const SourceIcon = sourceIcon[day.mainSource];

  // Employee lookup map
  const employeeMap = new Map<string, Employee>();
  for (const emp of employees) {
    employeeMap.set(emp.id, emp);
  }

  // Calculate Labor Cost from shifts
  let totalLaborHours = 0;
  let totalLaborCost = 0;
  for (const s of shifts) {
    const hours = calculateShiftHours(s.startTime, s.endTime);
    totalLaborHours += hours;
    const emp = employeeMap.get(s.employeeId);
    const wage = emp?.hourlyWage || 18.5; // fallback standard rate $18.50/hr
    totalLaborCost += hours * wage;
  }

  const rawFoodCost = day.expenses ?? 0;
  const foodCostRatio = day.revenue > 0 ? (rawFoodCost / day.revenue) * 100 : 0;
  const laborCostRatio = day.revenue > 0 ? (totalLaborCost / day.revenue) * 100 : 0;
  const primeCostRatio = day.revenue > 0 ? ((rawFoodCost + totalLaborCost) / day.revenue) * 100 : 0;
  const grossMargin = day.revenue - rawFoodCost - totalLaborCost;
  const grossMarginPct = day.revenue > 0 ? Math.round((grossMargin / day.revenue) * 100) : 0;

  // Comparison J-7 (same day last week)
  const prevRev = prevWeekDay?.revenue ?? null;
  const deltaVsPrevWeek = prevRev !== null ? day.revenue - prevRev : null;
  const deltaVsPrevWeekPct = prevRev !== null && prevRev > 0 ? Math.round((deltaVsPrevWeek! / prevRev) * 100) : null;

  return (
    <div className="mx-auto max-w-4xl w-full">
      <div className="mb-4">
        <Button href="/days" variant="ghost" size="sm" className="gap-1.5 text-mv-ink-soft">
          <ArrowLeft size={14} /> Retour à la performance quotidienne
        </Button>
      </div>

      <PageHeader
        eyebrow="Journée de service détaillée"
        title={formatDateWeekday(day.date)}
        description={`${sourceLabel[day.mainSource]} · Rush : ${rushLevelLabel[day.rushLevel ?? "normal"]}`}
        action={
          <div className="flex items-center gap-2">
            {day.anomaly ? (
              <Badge tone={anomalyBadge[day.anomaly].tone} className="text-sm px-2.5 py-0.5">
                {anomalyBadge[day.anomaly].label}
              </Badge>
            ) : (
              <Badge tone="neutral" className="text-sm px-2.5 py-0.5">
                Normal
              </Badge>
            )}
            {day.reviewed && (
              <Badge tone="green" className="text-sm px-2.5 py-0.5">
                <CheckCircle2 size={12} className="inline mr-1" /> Révisé
              </Badge>
            )}
          </div>
        }
      />

      {/* Hero Financial Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Revenu net</p>
          <p className="mt-1 font-display text-[24px] font-medium text-mv-green-dark">
            {formatCurrency(day.revenue)}
          </p>
          {deltaVsPrevWeek !== null ? (
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              <span className={deltaVsPrevWeek >= 0 ? "text-mv-green-dark font-medium" : "text-mv-red font-medium"}>
                {deltaVsPrevWeek >= 0 ? "+" : ""}
                {formatCurrency(deltaVsPrevWeek)} ({deltaVsPrevWeekPct}%)
              </span>
              <span className="text-mv-ink-faint">vs J-7</span>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-mv-ink-faint">Chiffre d&apos;affaires du jour</p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Food / Matières</p>
          <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
            {formatCurrency(rawFoodCost)}
          </p>
          <p className="mt-1 text-[11px] text-mv-ink-soft">
            {foodCostRatio.toFixed(1)}% des ventes (cible 28-32%)
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Main-d&apos;œuvre (Labor)</p>
          <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
            {formatCurrency(totalLaborCost)}
          </p>
          <p className="mt-1 text-[11px] text-mv-ink-soft">
            {laborCostRatio.toFixed(1)}% des ventes ({totalLaborHours.toFixed(1)} h)
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Marge brute op.</p>
          <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
            {formatCurrency(grossMargin)}
          </p>
          <p className="mt-1 text-[11px] text-mv-ink-soft">
            {grossMarginPct}% de rentabilité brute
          </p>
        </Card>
      </div>

      {/* Operational Ratios Benchmark (GEMINI.md standard) */}
      <Card className="mb-6 p-5">
        <CardHeader
          eyebrow="Ratios opérationnels de restauration"
          title="Indicateurs de gestion & Prime Cost"
          description="Standards Minerva Flow pour préserver la rentabilité (Prime Cost cible < 60%)."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-mv-ink">Prime Cost</span>
              <Badge tone={primeCostRatio <= 60 ? "green" : "amber"}>
                {primeCostRatio.toFixed(1)}%
              </Badge>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mv-border-soft">
              <div
                className={`h-full ${primeCostRatio <= 60 ? "bg-mv-green" : "bg-mv-amber"}`}
                style={{ width: `${Math.min(100, primeCostRatio)}%` }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-mv-ink-faint">
              Food + Labor. Seuil cible : &lt; 60% (idéal 55%–58%).
            </p>
          </div>

          <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-mv-ink">Food Cost Ratio</span>
              <Badge tone={foodCostRatio >= 26 && foodCostRatio <= 34 ? "green" : "neutral"}>
                {foodCostRatio.toFixed(1)}%
              </Badge>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mv-border-soft">
              <div
                className="h-full bg-mv-green-dark"
                style={{ width: `${Math.min(100, foodCostRatio * 2)}%` }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-mv-ink-faint">
              Matières premières et boissons. Cible 28% à 32%.
            </p>
          </div>

          <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-mv-ink">Labor Cost Ratio</span>
              <Badge tone={laborCostRatio >= 25 && laborCostRatio <= 35 ? "green" : "neutral"}>
                {laborCostRatio.toFixed(1)}%
              </Badge>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mv-border-soft">
              <div
                className="h-full bg-mv-lime-dark"
                style={{ width: `${Math.min(100, laborCostRatio * 2)}%` }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-mv-ink-faint">
              Masse salariale du service. Cible 28% à 32%.
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* General Info & Mix */}
        <Card className="p-5">
          <CardHeader eyebrow="Mix de service" title="Contexte & Canaux de vente" />
          <div className="space-y-4 text-[13px]">
            <div className="flex items-center justify-between rounded-lg bg-mv-cream-soft p-3">
              <div className="flex items-center gap-2.5">
                <SourceIcon size={18} className="text-mv-green-dark" />
                <div>
                  <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Canal dominant</p>
                  <p className="font-semibold text-mv-ink">{sourceLabel[day.mainSource]}</p>
                </div>
              </div>
              <Badge tone="lime">Activité principale</Badge>
            </div>

            {day.reservationCount !== undefined && day.reservationCount !== null && (
              <div className="flex items-center justify-between border-b border-mv-border-soft pb-3">
                <div className="flex items-center gap-2 text-mv-ink-soft">
                  <Users size={16} className="text-mv-ink-faint" />
                  <span>Réservations enregistrées</span>
                </div>
                <span className="font-semibold text-mv-ink">{day.reservationCount} couverts</span>
              </div>
            )}

            {(day.promoActive || day.menuChange) && (
              <div className="flex items-center justify-between border-b border-mv-border-soft pb-3">
                <div className="flex items-center gap-2 text-mv-ink-soft">
                  <UtensilsCrossed size={16} className="text-mv-ink-faint" />
                  <span>Facteurs opérationnels</span>
                </div>
                <div className="flex gap-1.5">
                  {day.promoActive && <Badge tone="amber">Promotion active</Badge>}
                  {day.menuChange && <Badge tone="amber">Menu modifié</Badge>}
                </div>
              </div>
            )}

            {day.events.length > 0 && (
              <div className="border-b border-mv-border-soft pb-3">
                <div className="mb-2 flex items-center gap-2 text-mv-ink-soft">
                  <Megaphone size={16} className="text-mv-ink-faint" />
                  <span>Événements spéciaux</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {day.events.map((e) => (
                    <Badge key={e} tone="lime">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {day.notes && (
              <div className="pt-1">
                <p className="mb-1 text-[11px] font-semibold uppercase text-mv-ink-faint">Notes d&apos;équipe</p>
                <p className="rounded-lg border border-mv-border bg-mv-cream-soft p-3 text-[12.5px] leading-relaxed text-mv-ink-soft">
                  {day.notes}
                </p>
              </div>
            )}

            <div className="pt-2 text-[11.5px] text-mv-ink-faint">
              Enregistré par <strong className="text-mv-ink">{day.author}</strong>
            </div>
          </div>
        </Card>

        {/* Staff Shifts on that Day */}
        <Card className="p-5">
          <CardHeader
            eyebrow="Équipe sur place"
            title="Quarts de travail planifiés"
            description={`${shifts.length} quart${shifts.length > 1 ? "s" : ""} enregistré${shifts.length > 1 ? "s" : ""} (${totalLaborHours.toFixed(1)} h totales)`}
          />
          {shifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-mv-border p-6 text-center">
              <UserCheck size={24} className="mb-2 text-mv-ink-faint" />
              <p className="text-[13px] font-medium text-mv-ink">Aucun quart planifié dans l&apos;horaire</p>
              <p className="mt-1 text-[11.5px] text-mv-ink-soft">
                Les heures de service peuvent être créées depuis la section Horaire.
              </p>
              <Button href="/horaire" size="sm" variant="secondary" className="mt-3 text-[12px]">
                Consulter l&apos;horaire
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {shifts.map((s) => {
                const emp = employeeMap.get(s.employeeId);
                const hours = calculateShiftHours(s.startTime, s.endTime);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-mv-border bg-mv-surface p-2.5 text-[12.5px]"
                  >
                    <div>
                      <p className="font-semibold text-mv-ink">{emp?.fullName || "Employé"}</p>
                      <p className="text-[11px] text-mv-ink-faint">
                        {s.positionLabel || emp?.roleTitle || "Service"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-mv-ink">
                        {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                      </p>
                      <p className="text-[11px] text-mv-ink-soft">{hours.toFixed(1)} h</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Financial Transactions of the Day */}
      {transactions.length > 0 && (
        <Card className="mb-6 p-5">
          <CardHeader
            eyebrow="Comptabilité"
            title="Transactions & Dépenses du jour"
            description="Écritures financières enregistrées à cette date"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-mv-border text-[11px] font-semibold uppercase text-mv-ink-faint">
                  <th className="py-2">Description</th>
                  <th className="py-2">Catégorie</th>
                  <th className="py-2 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mv-border-soft">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 font-medium text-mv-ink">{t.description}</td>
                    <td className="py-2.5">
                      <Badge tone="neutral" className="text-[11px]">
                        {t.category}
                      </Badge>
                    </td>
                    <td
                      className={`py-2.5 text-right font-semibold ${
                        t.direction === "in" ? "text-mv-green-dark" : "text-mv-ink"
                      }`}
                    >
                      {t.direction === "in" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

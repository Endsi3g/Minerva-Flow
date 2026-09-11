"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthCalendar } from "@/components/charts/MonthCalendar";
import { UnifiedTrendChart } from "@/components/charts/UnifiedTrendChart";
import { AddServiceDayModal, type AddServiceDayInput } from "@/components/forms/AddServiceDayModal";
import { ImportServiceDaysModal } from "@/components/forms/ImportServiceDaysModal";
import {
  createServiceDayAction,
  updateServiceDayAction,
  deleteServiceDayAction,
  type CreateServiceDayResult,
} from "./actions";
import { revenueTrend, margeTrend } from "@/lib/reports";
import { useApp } from "@/lib/app-context";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateFull, formatDateWeekday, cn } from "@/lib/utils";
import type { Anomaly, ServiceDay, ServiceSource } from "@/lib/types";
import { Plus, Upload, ShoppingBag, Truck, CalendarCheck, CalendarCheck2, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

const anomalyBadge: Record<NonNullable<Anomaly>, { label: string; tone: "amber" | "red" | "green" }> = {
  rush: { label: "Rush", tone: "green" },
  creux: { label: "Creux", tone: "amber" },
  probleme: { label: "Problème", tone: "red" },
};

/**
 * Builds a full-month calendar grid from actual service_days rows: every
 * day in the month gets an entry, days with no logged data default to 0.
 */
function buildHeatmap(days: ServiceDay[], year: number, month: number) {
  const revenueByDate = new Map(days.map((d) => [d.date, d.revenue]));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const out: { date: string; revenue: number; dow: number }[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    out.push({ date: iso, revenue: revenueByDate.get(iso) ?? 0, dow: date.getDay() });
  }
  return out;
}

export function DaysView({ initialServiceDays }: { initialServiceDays: ServiceDay[] }) {
  const { role } = useApp();
  const router = useRouter();
  const [days, setDays] = useState<ServiceDay[]>(initialServiceDays);
  const [open, setOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<ServiceDay | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  const now = useMemo(() => new Date(), []);
  const heat = useMemo(
    () => buildHeatmap(days, now.getFullYear(), now.getMonth()),
    [days, now]
  );
  const monthLabel = useMemo(() => {
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const full = formatDateFull(iso);
    return full.charAt(0).toUpperCase() + full.slice(full.indexOf(" ") + 1);
  }, [now]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const d of days) if (d.events.length) map[d.date] = true;
    return map;
  }, [days]);

  const canEdit = role === "owner" || role === "manager" || role === "staff";

  // Same revenueTrend/margeTrend used on Overview's "Revenu vs marge" widget
  // (lib/reports.ts) — reused here so the two pages never show diverging
  // numbers for the same underlying service days.
  const reportData = useMemo(
    () => ({ serviceDays: days, programs: [], campaigns: [], financialTransactions: [] }),
    [days]
  );
  const revTrend = useMemo(() => revenueTrend(reportData), [reportData]);
  const margTrend = useMemo(() => margeTrend(reportData), [reportData]);

  async function handleSubmit(input: AddServiceDayInput): Promise<CreateServiceDayResult> {
    const result = editingDay ? await updateServiceDayAction(editingDay.id, input) : await createServiceDayAction(input);
    if (result.ok) {
      setDays((prev) => {
        const withoutSameId = prev.filter((d) => d.id !== result.day.id);
        const withoutSameDate = withoutSameId.filter((d) => d.date !== result.day.date);
        return [...withoutSameDate, result.day].sort((a, b) => (a.date < b.date ? 1 : -1));
      });
      setEditingDay(null);
    }
    return result;
  }

  async function handleDelete(day: ServiceDay) {
    if (!window.confirm(`Supprimer la journée du ${formatDateWeekday(day.date)} ?`)) return;
    const ok = await deleteServiceDayAction(day.id);
    if (ok) setDays((prev) => prev.filter((d) => d.id !== day.id));
    else toast.error("La suppression a échoué.");
  }

  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "30d" | "all">("14d");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter days based on timeRange
  const rangeFilteredDays = useMemo(() => {
    if (selectedDate) return days.filter((d) => d.date === selectedDate);
    if (timeRange === "all") return days;
    const count = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
    return days.slice(0, count);
  }, [days, selectedDate, timeRange]);

  // Overall KPIs for the active filter
  const kpis = useMemo(() => {
    const list = rangeFilteredDays;
    if (list.length === 0) {
      return { avgRevenue: 0, rushRate: 0, bestDay: null, totalReservations: 0 };
    }
    const totalRev = list.reduce((sum, d) => sum + d.revenue, 0);
    const avgRevenue = Math.round(totalRev / list.length);
    const rushCount = list.filter((d) => d.rushLevel === "rush" || d.rushLevel === "debordement" || d.anomaly === "rush").length;
    const rushRate = Math.round((rushCount / list.length) * 100);
    const bestDay = [...list].sort((a, b) => b.revenue - a.revenue)[0];
    const totalReservations = list.reduce((sum, d) => sum + (d.reservationCount ?? 0), 0);
    return { avgRevenue, rushRate, bestDay, totalReservations };
  }, [rangeFilteredDays]);

  const totalPages = Math.max(1, Math.ceil(rangeFilteredDays.length / pageSize));
  const paginatedDays = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rangeFilteredDays.slice(start, start + pageSize);
  }, [rangeFilteredDays, currentPage, pageSize]);

  return (
    <div>
      <PageHeader
        eyebrow="Journées de service"
        title="Performance quotidienne"
        description="Le calendrier de vos services : niveau de revenu, source principale et notes remontées par l'équipe."
        action={
          canEdit && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload size={15} /> Importer un historique
              </Button>
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus size={15} /> Ajouter une journée
              </Button>
            </div>
          )
        }
      />

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Moyenne / jour</p>
          <p className="mt-1 font-display text-[22px] font-medium text-mv-ink">{formatCurrency(kpis.avgRevenue)}</p>
          <p className="mt-0.5 text-[11px] text-mv-ink-faint">{rangeFilteredDays.length} journées analysées</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Taux de rush</p>
          <p className="mt-1 font-display text-[22px] font-medium text-mv-green-dark">{kpis.rushRate}%</p>
          <p className="mt-0.5 text-[11px] text-mv-ink-faint">Haute affluence</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Meilleur service</p>
          <p className="mt-1 font-display text-[22px] font-medium text-mv-ink">
            {kpis.bestDay ? formatCurrency(kpis.bestDay.revenue) : "—"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-mv-ink-faint">
            {kpis.bestDay ? formatDateWeekday(kpis.bestDay.date) : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Réservations</p>
          <p className="mt-1 font-display text-[22px] font-medium text-mv-ink">{kpis.totalReservations}</p>
          <p className="mt-0.5 text-[11px] text-mv-ink-faint">Couverts réservés</p>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader
          eyebrow={monthLabel}
          title="Calendrier des revenus"
          description="Cliquez sur un jour pour filtrer le tableau ci-dessous sur cette journée."
        />
        <MonthCalendar
          data={heat}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d === selectedDate ? undefined : d);
            setCurrentPage(1);
          }}
          eventsByDate={eventsByDate}
        />
      </Card>

      {days.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            eyebrow="Revenus"
            title="Revenu vs marge"
            description="Toutes journées de la période — survolez une légende pour l'isoler"
          />
          <UnifiedTrendChart
            series={[
              { key: "revenu", slug: "revenu", label: "Revenu total", color: "var(--mv-green)", data: revTrend },
              { key: "marge", slug: "marge", label: "Marge estimée", color: "var(--mv-lime-dark)", data: margTrend },
            ]}
          />
        </Card>
      )}

      {days.length === 0 ? (
        <EmptyState
          icon={CalendarCheck2}
          title="Aucune journée enregistrée"
          description="Ajoutez votre première journée de service pour commencer à suivre vos revenus."
          action={
            canEdit && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus size={15} /> Ajouter une journée
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            {selectedDate ? (
              <div className="flex items-center gap-2 text-[12.5px]">
                <span className="text-mv-ink-soft">
                  Filtré sur <strong className="text-mv-ink">{formatDateWeekday(selectedDate)}</strong>
                </span>
                <button
                  onClick={() => {
                    setSelectedDate(undefined);
                    setCurrentPage(1);
                  }}
                  className="font-medium text-mv-green-dark hover:underline"
                >
                  Voir toute la période
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-mv-border bg-mv-surface p-1">
                {[
                  { key: "7d", label: "7 jours" },
                  { key: "14d", label: "14 jours" },
                  { key: "30d", label: "30 jours" },
                  { key: "all", label: "Tout" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setTimeRange(item.key as any);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                      timeRange === item.key
                        ? "bg-mv-green text-white shadow-xs"
                        : "text-mv-ink-soft hover:bg-mv-cream-soft hover:text-mv-ink"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className="text-[12px] text-mv-ink-faint">
              {rangeFilteredDays.length} journée{rangeFilteredDays.length > 1 ? "s" : ""}
            </div>
          </div>

          <Table>
            <THead>
              <Th>Date</Th>
              <Th className="text-right">Revenu</Th>
              <Th>Source principale</Th>
              <Th>Événements</Th>
              <Th>Notes</Th>
              <Th>Statut</Th>
              {canEdit && <Th className="text-right"></Th>}
            </THead>
            <tbody>
              {paginatedDays.map((d) => {
                const SourceIcon = sourceIcon[d.mainSource];
                return (
                  <Tr
                    key={d.id}
                    active={d.date === selectedDate}
                    onClick={() => router.push(`/days/${d.id}`)}
                    className="cursor-pointer"
                  >
                    <Td className="font-semibold">{formatDateWeekday(d.date)}</Td>
                    <Td className="text-right font-semibold">{formatCurrency(d.revenue)}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 text-mv-ink-soft">
                        <SourceIcon size={14} /> {sourceLabel[d.mainSource]}
                      </span>
                    </Td>
                    <Td>
                      {d.events.length ? (
                        <div className="flex flex-wrap gap-1">
                          {d.events.map((e) => (
                            <Badge key={e} tone="lime">
                              {e}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-mv-ink-faint">—</span>
                      )}
                    </Td>
                    <Td className="max-w-[240px]">
                      <span className="line-clamp-2 text-mv-ink-soft">{d.notes || "—"}</span>
                    </Td>
                    <Td>
                      {d.anomaly ? (
                        <Badge tone={anomalyBadge[d.anomaly].tone}>{anomalyBadge[d.anomaly].label}</Badge>
                      ) : (
                        <Badge tone="neutral">Normal</Badge>
                      )}
                    </Td>
                    {canEdit && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDay(d);
                            }}
                            aria-label="Modifier"
                            className="rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(d);
                            }}
                            aria-label="Supprimer"
                            className="rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-red/10 hover:text-mv-red"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </Td>
                    )}
                  </Tr>
                );
              })}
            </tbody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-mv-border-soft pt-3">
              <span className="text-[12px] text-mv-ink-faint">
                Page <strong className="text-mv-ink">{currentPage}</strong> sur{" "}
                <strong className="text-mv-ink">{totalPages}</strong> (
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rangeFilteredDays.length)} sur{" "}
                {rangeFilteredDays.length})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-8 text-[12px]"
                >
                  Précédent
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 text-[12px]"
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddServiceDayModal
        open={open || Boolean(editingDay)}
        onClose={() => {
          setOpen(false);
          setEditingDay(null);
        }}
        onSubmit={handleSubmit}
        editingDay={editingDay}
      />
      <ImportServiceDaysModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />
    </div>
  );
}

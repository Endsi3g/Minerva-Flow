"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthCalendar } from "@/components/charts/MonthCalendar";
import { AddServiceDayModal, type AddServiceDayInput } from "@/components/forms/AddServiceDayModal";
import { ImportServiceDaysModal } from "@/components/forms/ImportServiceDaysModal";
import { createServiceDayAction, type CreateServiceDayResult } from "./actions";
import { useApp } from "@/lib/app-context";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateFull, formatDateWeekday } from "@/lib/utils";
import type { Anomaly, ServiceDay, ServiceSource } from "@/lib/types";
import { Plus, Upload, ShoppingBag, Truck, CalendarCheck, CalendarCheck2 } from "lucide-react";
import { useMemo, useState } from "react";

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

  const canEdit = role === "owner" || role === "staff";

  async function handleSubmit(input: AddServiceDayInput): Promise<CreateServiceDayResult> {
    const result = await createServiceDayAction(input);
    if (result.ok) {
      setDays((prev) => {
        const withoutSameDate = prev.filter((d) => d.date !== result.day.date);
        return [...withoutSameDate, result.day].sort((a, b) => (a.date < b.date ? 1 : -1));
      });
    }
    return result;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Journées de service"
        title="Journées"
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

      <Card className="mb-6">
        <CardHeader
          eyebrow={monthLabel}
          title="Calendrier des revenus"
          description="Cliquez sur un jour pour filtrer le tableau ci-dessous sur cette journée."
        />
        <MonthCalendar
          data={heat}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d === selectedDate ? undefined : d)}
          eventsByDate={eventsByDate}
        />
      </Card>

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
          {selectedDate && (
            <div className="mb-3 flex items-center gap-2 text-[12.5px]">
              <span className="text-mv-ink-soft">
                Filtré sur <strong className="text-mv-ink">{formatDateWeekday(selectedDate)}</strong>
              </span>
              <button
                onClick={() => setSelectedDate(undefined)}
                className="font-medium text-mv-green-dark hover:underline"
              >
                Voir tout le mois
              </button>
            </div>
          )}
          <Table>
          <THead>
            <Th>Date</Th>
            <Th className="text-right">Revenu</Th>
            <Th>Source principale</Th>
            <Th>Événements</Th>
            <Th>Notes</Th>
            <Th>Statut</Th>
          </THead>
          <tbody>
            {(selectedDate ? days.filter((d) => d.date === selectedDate) : days).map((d) => {
              const SourceIcon = sourceIcon[d.mainSource];
              return (
                <Tr key={d.id} active={d.date === selectedDate}>
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
                </Tr>
              );
            })}
          </tbody>
        </Table>
        </>
      )}

      <AddServiceDayModal open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} />
      <ImportServiceDaysModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />
    </div>
  );
}

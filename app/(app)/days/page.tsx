"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { MonthCalendar } from "@/components/charts/MonthCalendar";
import { AddServiceDayModal } from "@/components/forms/AddServiceDayModal";
import { serviceDays, heatmapMonth } from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDateWeekday } from "@/lib/utils";
import type { Anomaly, ServiceSource } from "@/lib/types";
import { Plus, ShoppingBag, Truck, CalendarCheck } from "lucide-react";
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

export default function DaysPage() {
  const { role } = useApp();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const heat = useMemo(() => heatmapMonth(2026, 6), []);
  const eventsByDate = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const d of serviceDays) if (d.events.length) map[d.date] = true;
    return map;
  }, []);

  const canEdit = role === "owner" || role === "staff";

  return (
    <div>
      <PageHeader
        eyebrow="Journées de service"
        title="Days"
        description="Le calendrier de vos services : niveau de revenu, source principale et notes remontées par l'équipe."
        action={
          canEdit && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus size={15} /> Ajouter une journée
            </Button>
          )
        }
      />

      <Card className="mb-6">
        <CardHeader
          eyebrow="Juillet 2026"
          title="Calendrier des revenus"
          description="Cliquez sur un jour pour le mettre en évidence dans le tableau ci-dessous."
        />
        <MonthCalendar
          data={heat}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d === selectedDate ? undefined : d)}
          eventsByDate={eventsByDate}
        />
      </Card>

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
          {serviceDays.map((d) => {
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

      <AddServiceDayModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

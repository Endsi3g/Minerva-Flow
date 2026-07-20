import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateWeekday } from "@/lib/utils";
import type { Anomaly, RushLevel, ServiceDay, ServiceSource } from "@/lib/types";
import { ArrowLeft, ShoppingBag, Truck, CalendarCheck, Users, Megaphone, UtensilsCrossed, CheckCircle2 } from "lucide-react";

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

export function ServiceDayDetailView({ day }: { day: ServiceDay }) {
  const SourceIcon = sourceIcon[day.mainSource];
  const margin = day.expenses !== undefined ? day.revenue - day.expenses : null;

  return (
    <div className="mx-auto max-w-3xl w-full">
      <div className="mb-4">
        <Button href="/days" variant="ghost" size="sm" className="gap-1.5 text-mv-ink-soft">
          <ArrowLeft size={14} /> Retour aux journées
        </Button>
      </div>

      <PageHeader
        eyebrow="Journée de service"
        title={formatDateWeekday(day.date)}
        description={`${sourceLabel[day.mainSource]} · Rush : ${rushLevelLabel[day.rushLevel ?? "normal"]}`}
        action={
          day.anomaly ? (
            <Badge tone={anomalyBadge[day.anomaly].tone} className="text-sm px-2.5 py-0.5">
              {anomalyBadge[day.anomaly].label}
            </Badge>
          ) : (
            <Badge tone="neutral" className="text-sm px-2.5 py-0.5">
              Normal
            </Badge>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Revenu</p>
          <p className="mt-0.5 font-display text-[20px] font-medium text-mv-green-dark">
            {formatCurrency(day.revenue)}
          </p>
        </Card>
        {day.expenses !== undefined && (
          <Card className="text-center">
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Dépenses</p>
            <p className="mt-0.5 font-display text-[20px] font-medium text-mv-ink">
              {formatCurrency(day.expenses)}
            </p>
          </Card>
        )}
        {margin !== null && (
          <Card className="text-center">
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Marge</p>
            <p className="mt-0.5 font-display text-[20px] font-medium text-mv-ink">{formatCurrency(margin)}</p>
          </Card>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader eyebrow="Détails" title="Informations générales" />
        <div className="space-y-4 text-[13px]">
          <div className="flex items-center gap-2.5 text-mv-ink-soft">
            <SourceIcon size={16} className="text-mv-green-dark" />
            <div>
              <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Source principale</p>
              <p className="font-medium text-mv-ink">{sourceLabel[day.mainSource]}</p>
            </div>
          </div>

          {day.reservationCount !== undefined && day.reservationCount !== null && (
            <div className="flex items-center gap-2.5 text-mv-ink-soft">
              <Users size={16} className="text-mv-ink-faint" />
              <div>
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Réservations</p>
                <p className="font-medium text-mv-ink">{day.reservationCount}</p>
              </div>
            </div>
          )}

          {day.events.length > 0 && (
            <div className="flex items-start gap-2.5 text-mv-ink-soft">
              <Megaphone size={16} className="mt-0.5 text-mv-ink-faint" />
              <div>
                <p className="text-[11px] font-semibold uppercase text-mv-ink-faint mb-1">Événements</p>
                <div className="flex flex-wrap gap-1">
                  {day.events.map((e) => (
                    <Badge key={e} tone="lime">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(day.promoActive || day.menuChange) && (
            <div className="flex items-center gap-2.5 text-mv-ink-soft">
              <UtensilsCrossed size={16} className="text-mv-ink-faint" />
              <div className="flex flex-wrap gap-1.5">
                {day.promoActive && <Badge tone="amber">Promotion active</Badge>}
                {day.menuChange && <Badge tone="amber">Changement de menu</Badge>}
              </div>
            </div>
          )}

          {day.reviewed && (
            <div className="flex items-center gap-2.5 text-mv-green-dark">
              <CheckCircle2 size={16} />
              <p className="font-medium">Journée révisée</p>
            </div>
          )}

          {day.notes && (
            <div className="border-t border-mv-border-soft pt-3">
              <p className="text-[11px] font-semibold uppercase text-mv-ink-faint mb-1">Notes</p>
              <p className="leading-relaxed text-mv-ink-soft">{day.notes}</p>
            </div>
          )}

          <div className="border-t border-mv-border-soft pt-3">
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Enregistrée par</p>
            <p className="font-medium text-mv-ink">{day.author}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

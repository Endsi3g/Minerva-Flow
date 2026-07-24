"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { UnifiedTrendChart } from "@/components/charts/UnifiedTrendChart";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { MonthCalendar } from "@/components/charts/MonthCalendar";
import { LiveAlertsPanel } from "@/components/minerva/LiveAlertsPanel";
import { RecommendationsPanel } from "@/components/minerva/RecommendationsPanel";
import { StartupChecklist } from "@/components/minerva/StartupChecklist";
import { WidgetManagerModal, useWidgetVisibility } from "@/components/minerva/WidgetManagerModal";
import { LiveKpiSync } from "@/components/realtime/LiveKpiSync";
import { formatCurrency, formatDateFull } from "@/lib/utils";
import { CalendarCheck2, Megaphone, ArrowRight, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { Alert, Recommendation, ServiceDay } from "@/lib/types";

export function OverviewClientView({
  restaurantId,
  greeting,
  firstName,
  monthMarge,
  todayLabel,
  revTrend,
  margTrend,
  serviceDays,
  joursSparkData,
  activeCampaignsCount,
  campagnesSparkData,
  heat,
  alerts,
  recommendations,
}: {
  restaurantId: string;
  greeting: string;
  firstName: string | null;
  monthMarge: number;
  todayLabel: string;
  revTrend: { date: string; revenue: number }[];
  margTrend: { date: string; revenue: number }[];
  serviceDays: ServiceDay[];
  joursSparkData: { date: string; value: number }[];
  activeCampaignsCount: number;
  campagnesSparkData: { date: string; value: number }[];
  heat: { date: string; revenue: number; dow: number }[];
  alerts: Alert[];
  recommendations: Recommendation[];
}) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const { visibleWidgets, toggleWidget, resetWidgets, isVisible } = useWidgetVisibility();
  const router = useRouter();

  const now = useMemo(() => new Date(), []);
  const monthLabel = useMemo(() => {
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const full = formatDateFull(iso);
    return full.charAt(0).toUpperCase() + full.slice(full.indexOf(" ") + 1);
  }, [now]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const d of serviceDays) if (d.events.length) map[d.date] = true;
    return map;
  }, [serviceDays]);

  function handleSelectDate(date: string) {
    if (date === selectedDate) {
      setSelectedDate(undefined);
    } else {
      router.push(`/days?date=${date}`);
    }
  }

  return (
    <div className="space-y-5">
      <LiveKpiSync restaurantId={restaurantId} />

      <PageHeader
        eyebrow="Vue globale"
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        description={`Voici votre marge cumulée du mois — ${formatCurrency(monthMarge)} au ${todayLabel}.`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setManagerOpen(true)}
              className="text-[12.5px] whitespace-nowrap"
            >
              <SlidersHorizontal size={14} /> Personnaliser mes widgets
            </Button>
            <Button href="/days" variant="secondary" size="sm" className="hidden sm:inline-flex text-[12.5px]">
              <CalendarCheck2 size={14} /> Ajouter une journée
            </Button>
          </div>
        }
      />

      <StartupChecklist />

      {/* KPI Trend Chart & Summary Cards Widget */}
      {isVisible("widget-kpi-summary") && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="mv-animate-in lg:col-span-2">
            <Card className="h-full p-4 sm:p-5">
              <CardHeader
                eyebrow="Revenus"
                title="Revenu vs marge"
                description="Cumulé, tous programmes — survolez une légende pour l'isoler"
              />
              <UnifiedTrendChart
                series={[
                  { key: "revenu", slug: "revenu", label: "Revenu total", color: "var(--mv-green)", data: revTrend },
                  { key: "marge", slug: "marge", label: "Marge estimée", color: "var(--mv-lime-dark)", data: margTrend },
                ]}
              />
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Link
              href="/reports/journees"
              className="group mv-animate-in flex-1 rounded-2xl border border-mv-border bg-mv-surface p-4 sm:p-5 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-[11.5px] sm:text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  Journées de service
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-ink/[0.06] text-mv-ink-soft">
                  <CalendarCheck2 size={16} strokeWidth={2.2} />
                </div>
              </div>
              <p className="mt-2 sm:mt-3 font-display text-[24px] sm:text-[28px] font-medium leading-none text-mv-ink">
                {serviceDays.length}
              </p>
              <div className="mt-2">
                <MiniSparkline id="jours" data={joursSparkData} color="var(--mv-amber)" />
              </div>
              <p className="mt-1 flex items-center gap-1 text-[12px] sm:text-[12.5px] font-semibold text-mv-green-dark">
                Voir le rapport
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>

            <Link
              href="/reports/campagnes"
              className="group mv-animate-in flex-1 rounded-2xl border border-mv-border bg-mv-surface p-4 sm:p-5 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-[11.5px] sm:text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  Campagnes actives
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-ink/[0.06] text-mv-ink-soft">
                  <Megaphone size={16} strokeWidth={2.2} />
                </div>
              </div>
              <p className="mt-2 sm:mt-3 font-display text-[24px] sm:text-[28px] font-medium leading-none text-mv-ink">
                {activeCampaignsCount}
              </p>
              <div className="mt-2">
                <MiniSparkline id="campagnes" data={campagnesSparkData} color="var(--mv-green)" />
              </div>
              <p className="mt-1 flex items-center gap-1 text-[12px] sm:text-[12.5px] font-semibold text-mv-green-dark">
                Voir les campagnes
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* Month Calendar Widget */}
      {isVisible("widget-heatmap") && (
        <div className="mb-6 mv-animate-in">
          <Card className="p-4 sm:p-5">
            <CardHeader
              eyebrow={monthLabel}
              title="Calendrier des revenus"
              description="Cliquez sur un jour pour accéder au détail de cette journée."
            />
            <MonthCalendar
              data={heat}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              eventsByDate={eventsByDate}
            />
          </Card>
        </div>
      )}

      {/* Alerts & Recommendations Widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isVisible("widget-alerts") && (
          <div className="mv-animate-in">
            <LiveAlertsPanel restaurantId={restaurantId} initial={alerts} />
          </div>
        )}
        {isVisible("widget-recommendations") && (
          <div className="mv-animate-in">
            <RecommendationsPanel initial={recommendations} />
          </div>
        )}
      </div>

      <WidgetManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        visibleWidgets={visibleWidgets}
        onToggle={toggleWidget}
        onReset={resetWidgets}
      />
    </div>
  );
}

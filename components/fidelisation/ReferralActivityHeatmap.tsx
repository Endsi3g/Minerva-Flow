"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { MousePointerClick, UserPlus, Flame, Calendar, Info } from "lucide-react";
import type { ReferralDailyActivity } from "@/lib/data/referral-roi";

type HeatmapMetric = "all" | "clicks" | "conversions";

interface ReferralActivityHeatmapProps {
  activity: ReferralDailyActivity[];
}

const MONTH_NAMES = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
];

export function ReferralActivityHeatmap({ activity }: ReferralActivityHeatmapProps) {
  const [metric, setMetric] = useState<HeatmapMetric>("all");
  const [hoveredDay, setHoveredDay] = useState<ReferralDailyActivity | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Organize days into weeks (columns)
  const { weeks, monthHeaders, totalClicks, totalConversions, maxActivityDay } = useMemo(() => {
    if (!activity || activity.length === 0) {
      return {
        weeks: [],
        monthHeaders: [],
        totalClicks: 0,
        totalConversions: 0,
        maxActivityDay: null,
      };
    }

    let clicksSum = 0;
    let conversionsSum = 0;
    let maxVal = -1;
    let bestDay: ReferralDailyActivity | null = null;

    for (const item of activity) {
      clicksSum += item.clicks;
      conversionsSum += item.conversions;
      const val = item.clicks + item.conversions * 2;
      if (val > maxVal) {
        maxVal = val;
        bestDay = item;
      }
    }

    // Align starting day to Monday of that week
    const firstDate = new Date(activity[0].date + "T00:00:00");
    // getDay: 0=Sun, 1=Mon, ..., 6=Sat -> adjust so 0=Mon, ..., 6=Sun
    const dayOfWeekFirst = (firstDate.getDay() + 6) % 7;

    const paddedItems: (ReferralDailyActivity | null)[] = [];
    for (let p = 0; p < dayOfWeekFirst; p++) {
      paddedItems.push(null);
    }
    for (const item of activity) {
      paddedItems.push(item);
    }

    // Pad end of the last week to complete Sunday
    while (paddedItems.length % 7 !== 0) {
      paddedItems.push(null);
    }

    // Group into 7-day columns (weeks)
    const weekCols: (ReferralDailyActivity | null)[][] = [];
    for (let i = 0; i < paddedItems.length; i += 7) {
      weekCols.push(paddedItems.slice(i, i + 7));
    }

    // Month headers positioning
    const headers: { month: string; colIndex: number }[] = [];
    let lastMonth = -1;
    weekCols.forEach((week, colIdx) => {
      const firstValidDay = week.find((d) => d !== null);
      if (firstValidDay) {
        const m = new Date(firstValidDay.date + "T00:00:00").getMonth();
        if (m !== lastMonth) {
          headers.push({ month: MONTH_NAMES[m], colIndex: colIdx });
          lastMonth = m;
        }
      }
    });

    return {
      weeks: weekCols,
      monthHeaders: headers,
      totalClicks: clicksSum,
      totalConversions: conversionsSum,
      maxActivityDay: bestDay,
    };
  }, [activity]);

  // Determine color scale thresholds dynamically
  const maxMetricValue = useMemo(() => {
    if (!activity || activity.length === 0) return 1;
    return Math.max(
      1,
      ...activity.map((d) => {
        if (metric === "clicks") return d.clicks;
        if (metric === "conversions") return d.conversions;
        return d.clicks + d.conversions * 2;
      })
    );
  }, [activity, metric]);

  const getCellLevel = (day: ReferralDailyActivity | null): number => {
    if (!day) return 0;
    const val =
      metric === "clicks"
        ? day.clicks
        : metric === "conversions"
          ? day.conversions
          : day.clicks + day.conversions * 2;

    if (val <= 0) return 0;
    const ratio = val / maxMetricValue;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-mv-green-tint/90 border-mv-green/30";
      case 2:
        return "bg-[#86efac] border-emerald-400";
      case 3:
        return "bg-mv-green border-mv-green-dark";
      case 4:
        return "bg-mv-green-dark border-[#063b29]";
      case 0:
      default:
        return "bg-mv-cream-soft/80 border-mv-border/60 hover:border-mv-ink-faint";
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="relative overflow-visible">
      <CardHeader
        eyebrow="Chronologie"
        title="Activité de parrainage"
        description="Fréquence et intensité journalière des clics et conversions sur vos liens de recommandation."
        action={
          <div className="flex items-center gap-1 rounded-full border border-mv-border bg-mv-cream-soft p-1">
            <button
              onClick={() => setMetric("all")}
              className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition-all ${
                metric === "all"
                  ? "bg-mv-surface text-mv-ink shadow-mv-sm"
                  : "text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setMetric("clicks")}
              className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition-all ${
                metric === "clicks"
                  ? "bg-mv-surface text-mv-ink shadow-mv-sm"
                  : "text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              Clics
            </button>
            <button
              onClick={() => setMetric("conversions")}
              className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition-all ${
                metric === "conversions"
                  ? "bg-mv-surface text-mv-ink shadow-mv-sm"
                  : "text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              Inscriptions
            </button>
          </div>
        }
      />

      {/* Mini KPI Highlights Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-b border-mv-border-soft pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mv-cream-soft border border-mv-border-soft text-mv-ink-soft">
            <MousePointerClick size={16} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Clics enregistrés</p>
            <p className="font-display text-[17px] font-bold text-mv-ink">{totalClicks}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
            <UserPlus size={16} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Filleuls convertis</p>
            <p className="font-display text-[17px] font-bold text-mv-green-dark">{totalConversions}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mv-cream-soft border border-mv-border-soft text-mv-ink-soft">
            <Calendar size={16} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Période suivie</p>
            <p className="font-display text-[17px] font-bold text-mv-ink">{activity.length} jours</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mv-lime-tint text-mv-green-darker">
            <Flame size={16} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Pic d&apos;activité</p>
            <p className="font-display text-[17px] font-bold text-mv-ink">
              {maxActivityDay
                ? `${maxActivityDay.clicks + maxActivityDay.conversions} act.`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* The GitHub Activity Heatmap Grid Container */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Month Header row */}
          <div className="flex text-[11px] font-semibold text-mv-ink-faint mb-1.5 pl-7">
            {monthHeaders.map((m, idx) => (
              <span
                key={`${m.month}-${idx}`}
                className="inline-block"
                style={{
                  width: `${(weeks.length / monthHeaders.length) * 16}px`,
                  minWidth: "48px",
                }}
              >
                {m.month}
              </span>
            ))}
          </div>

          <div className="flex items-start gap-2">
            {/* Day of week labels (Y axis) */}
            <div className="flex flex-col justify-between text-[10px] font-medium text-mv-ink-faint h-[105px] pr-1 select-none">
              <span>Lun</span>
              <span>Mer</span>
              <span>Ven</span>
            </div>

            {/* Weeks Columns Grid */}
            <div className="flex gap-[3.5px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3.5px]">
                  {week.map((day, dIdx) => {
                    const level = getCellLevel(day);
                    const colorClass = getLevelColor(level);

                    return (
                      <div
                        key={dIdx}
                        onMouseEnter={(e) => {
                          if (day) {
                            setHoveredDay(day);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`h-3 w-3 rounded-[2.5px] border transition-all cursor-pointer ${
                          day
                            ? `${colorClass} hover:scale-125 hover:z-10 hover:shadow-mv-sm`
                            : "bg-transparent border-transparent cursor-default pointer-events-none"
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Legend Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-mv-ink-faint pt-3 border-t border-mv-border-soft">
            <div className="flex items-center gap-1.5">
              <Info size={13} className="text-mv-ink-soft" />
              <span>
                {metric === "all"
                  ? "Affichage combiné : clics + conversions (pondérées x2)"
                  : metric === "clicks"
                    ? "Affichage du volume de clics par jour"
                    : "Affichage des nouveaux filleuls devenus clients par jour"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>Moins</span>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-[2px] border bg-mv-cream-soft/80 border-mv-border/60" />
                <span className="h-3 w-3 rounded-[2px] border bg-mv-green-tint/90 border-mv-green/30" />
                <span className="h-3 w-3 rounded-[2px] border bg-[#86efac] border-emerald-400" />
                <span className="h-3 w-3 rounded-[2px] border bg-mv-green border-mv-green-dark" />
                <span className="h-3 w-3 rounded-[2px] border bg-mv-green-dark border-[#063b29]" />
              </div>
              <span>Plus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && tooltipPos && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] pointer-events-none rounded-xl border border-mv-border bg-mv-surface p-3 text-[12px] shadow-mv-lg animate-in fade-in zoom-in-95 duration-100 min-w-[200px]"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <p className="font-semibold capitalize text-mv-ink mb-1.5">
            {formatDateDisplay(hoveredDay.date)}
          </p>
          <div className="space-y-1 text-mv-ink-soft text-[11.5px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MousePointerClick size={12} className="text-mv-ink-faint" />
                Clics sur le lien :
              </span>
              <span className="font-bold text-mv-ink">{hoveredDay.clicks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <UserPlus size={12} className="text-mv-green-dark" />
                Filleuls inscrits :
              </span>
              <span className="font-bold text-mv-green-dark">{hoveredDay.conversions}</span>
            </div>
            <div className="flex items-center justify-between border-t border-mv-border-soft pt-1 mt-1 text-[10.5px]">
              <span className="text-mv-ink-faint">Taux de conversion :</span>
              <span className="font-mono font-bold text-mv-ink">
                {hoveredDay.clicks > 0
                  ? `${Math.round((hoveredDay.conversions / hoveredDay.clicks) * 100)}%`
                  : hoveredDay.conversions > 0
                    ? "100%"
                    : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

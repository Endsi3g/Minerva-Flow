import { intlLocale } from "@/lib/format-locale";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { CONTRIBUTION_SOURCES, type Heatmap, type HeatmapDay, type HeatmapLevel } from "@/lib/team/contributions";

const LEVEL_CLASS: Record<HeatmapLevel, string> = {
  0: "bg-mv-ink/[0.07]",
  1: "bg-mv-green/25",
  2: "bg-mv-green/45",
  3: "bg-mv-green/70",
  4: "bg-mv-green",
};

function dayTitle(day: HeatmapDay, locale?: string): string {
  const date = new Date(`${day.date}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  if (day.count === 0) return `${date} · aucune contribution`;
  const detail = CONTRIBUTION_SOURCES.filter((s) => day.bySource[s.key]).map((s) => `${day.bySource[s.key]} ${s.label.toLowerCase()}`);
  return `${date} · ${day.count} contribution${day.count > 1 ? "s" : ""} (${detail.join(", ")})`;
}

export function ContributionHeatmap({
  heatmap,
  size = "md",
  showLegend = true,
}: {
  heatmap: Heatmap;
  size?: "sm" | "md";
  showLegend?: boolean;
}) {
  const locale = useLocale();
  const cell = size === "sm" ? "size-[7px] rounded-[2px]" : "size-3 rounded-[3px]";
  const gap = size === "sm" ? "gap-[2px]" : "gap-[3px]";

  // Month label above the first week that starts a new month.
  const monthLabels = size === "md" ? heatmap.days.filter((_, i) => i % 7 === 0).map((day, week, all) => {
    const month = day.date.slice(0, 7);
    const previous = week > 0 ? all[week - 1].date.slice(0, 7) : null;
    return month !== previous ? new Date(`${day.date}T12:00:00Z`).toLocaleDateString(intlLocale(locale), { month: "short", timeZone: "UTC" }).replace(".", "") : "";
  }) : [];

  return (
    <div>
      <div
        role="img"
        aria-label={`${heatmap.total} contribution${heatmap.total > 1 ? "s" : ""} sur les ${heatmap.weeks} dernières semaines`}
        className="overflow-x-auto"
      >
        {size === "md" && (
          <div className={cn("mb-1 grid text-[12px] text-mv-ink-faint", gap)} style={{ gridTemplateColumns: `repeat(${heatmap.weeks}, 12px)` }} aria-hidden="true">
            {monthLabels.map((label, i) => (
              <span key={i} className="overflow-visible whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
        )}
        <div
          className={cn("grid grid-flow-col", gap)}
          style={{ gridTemplateRows: "repeat(7, auto)", gridAutoColumns: "max-content" }}
          aria-hidden="true"
        >
          {heatmap.days.map((day) => (
            <span
              key={day.date}
              title={dayTitle(day, locale)}
              className={cn(cell, day.future ? "bg-transparent" : LEVEL_CLASS[day.level])}
            />
          ))}
        </div>
      </div>
      {showLegend && (
        <div className="mt-2 flex items-center justify-end gap-1.5 text-[12px] text-mv-ink-faint" aria-hidden="true">
          Moins
          {([0, 1, 2, 3, 4] as HeatmapLevel[]).map((level) => (
            <span key={level} className={cn("size-3 rounded-[3px]", LEVEL_CLASS[level])} />
          ))}
          Plus
        </div>
      )}
    </div>
  );
}

"use client";


import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShareCardConfigurator } from "@/components/fidelisation/ShareCardConfigurator";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import type { ShareableMetric } from "@/lib/data/retention-metrics";
import type { RetentionTimeRange } from "@/lib/data/retention-metrics";
import { Card } from "@/components/minerva/PageCard";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  metrics: ShareableMetric[];
  restaurantName: string;
  logoUrl: string | null;
  restaurantUrl: string;
  timeRange: RetentionTimeRange;
};

const ranges: { id: RetentionTimeRange; label: string }[] = [
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "90d", label: "90 jours" },
  { id: "all", label: "Tout" },
];

export function ResultatsView({ metrics, restaurantName, logoUrl, restaurantUrl, timeRange }: Props) {
  const t = useTranslations("resultsView");
  return (
    <div className="space-y-6">
      <FidelisationSubNav />
      <PageHeader
        eyebrow={t("loyalty")}
        title={t("resultsToShare")}
        description={t("generateAResultsCard")}
      />
      <section aria-label={t("resultsPeriod")} className="flex flex-col gap-3 rounded-xl border border-mv-border bg-mv-cream-soft p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-mv-ink">{t("comparisonPeriod")}</h2>
          <p className="text-[12px] text-mv-ink-faint">{t("theFiguresAndThe")}</p>
        </div>
        <nav aria-label={t("chooseThePeriod")} className="flex flex-wrap gap-1 rounded-lg bg-mv-surface p-1">
          {ranges.map(({ id, label }) => (
            <Link key={id} href={`/fidelisation/resultats?period=${id}`} aria-current={timeRange === id ? "page" : undefined} className={cn("rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors", timeRange === id ? "bg-mv-green text-white" : "text-mv-ink-soft hover:bg-mv-cream-soft")}>
              {label}
            </Link>
          ))}
        </nav>
      </section>
      {metrics.length > 0 && (
        <section aria-label={t("loyaltyIndicators")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {metrics.slice(0, 4).map((metric) => (
            <Card key={metric.id} className="space-y-1.5">
              <p className="text-[12px] font-medium text-mv-ink-faint">{metric.label}</p>
              <p className="font-display text-2xl font-semibold tracking-tight text-mv-ink">{metric.formattedValue}</p>
            </Card>
          ))}
        </section>
      )}
      <ShareCardConfigurator
        metrics={metrics}
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        restaurantUrl={restaurantUrl}
      />
    </div>
  );
}

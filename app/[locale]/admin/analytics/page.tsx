import { ExternalLink, BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AnalyticsInsightsView } from "./AnalyticsInsightsView";
import {
  isPostHogQueryConfigured,
  getTrafficOverview,
  getCountryBreakdown,
  getBrowserBreakdown,
  getChannelBreakdown,
  getRetentionCohorts,
  getHourlyHeatmap,
} from "@/lib/data/posthog-insights";

export default async function AdminAnalyticsPage() {
  const t = await getTranslations("admin.analytics");
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "";
  const dashboardUrl = host.includes(".i.posthog.com") ? host.replace(".i.posthog.com", ".posthog.com") : null;

  const queryConfigured = isPostHogQueryConfigured();
  const [overview, countries, browsers, channels, retention, heatmap] = queryConfigured
    ? await Promise.all([
        getTrafficOverview(),
        getCountryBreakdown(),
        getBrowserBreakdown(),
        getChannelBreakdown(),
        getRetentionCohorts(),
        getHourlyHeatmap(),
      ])
    : [null, null, null, null, null, null];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("title")}</h1>
          <p className="text-[13px] text-mv-ink-soft">{t("description")}</p>
        </div>
        {dashboardUrl && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft transition-colors hover:text-mv-ink"
          >
            {t("openPostHog")} <ExternalLink size={12} />
          </a>
        )}
      </div>

      {!queryConfigured ? (
        <div className="rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
            <BarChart3 size={18} />
          </div>
          <p className="mb-1.5 font-display text-[16px] font-medium text-mv-ink">{t("dashboardTitle")}</p>
          <p className="max-w-md text-[13px] leading-relaxed text-mv-ink-soft">{t("configureHostHint")}</p>
        </div>
      ) : (
        <AnalyticsInsightsView
          overview={overview}
          countries={countries}
          browsers={browsers}
          channels={channels}
          retention={retention}
          heatmap={heatmap}
        />
      )}
    </div>
  );
}

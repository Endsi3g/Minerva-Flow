import { ExternalLink, BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminAnalyticsPage() {
  const t = await getTranslations("admin.analytics");
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "";
  const dashboardUrl = host.includes(".i.posthog.com") ? host.replace(".i.posthog.com", ".posthog.com") : null;

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{t("title")}</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        {t("description")}
      </p>

      <div className="rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-sm">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
          <BarChart3 size={18} />
        </div>
        <p className="mb-1.5 font-display text-[16px] font-medium text-mv-ink">
          {t("dashboardTitle")}
        </p>
        <p className="mb-4 max-w-md text-[13px] leading-relaxed text-mv-ink-soft">
          {t("dashboardDescription")}
        </p>
        {dashboardUrl ? (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-mv-ink px-3.5 py-2 text-[13px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-ink/90"
          >
            {t("openPostHog")} <ExternalLink size={13} />
          </a>
        ) : (
          <p className="text-[12.5px] text-mv-ink-faint">
            {t("configureHostHint")}
          </p>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResultsShareStudio } from "@/components/share/ResultsShareStudio";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getRestaurantShareResults, parseSharePeriod, SHARE_PERIODS } from "@/lib/data/share-results";
import { restaurantShareMetrics } from "@/lib/share/results";
import { CampaignsSubNav } from "../CampaignsSubNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("campaignResults");
  return { title: t("shareMyResults2") };
}

export default async function ShareResultsPage({ searchParams }: { searchParams: Promise<{ jours?: string }> }) {
  const t = await getTranslations("campaignResults");
  const locale = await getLocale();
  const membership = await getCurrentMembership();
  // Same gate as publishing to Instagram: sharing results is an owner/manager act.
  if (!membership || !["owner", "manager"].includes(membership.role)) redirect(`/${locale}/campaigns`);

  const days = parseSharePeriod((await searchParams).jours);
  const [restaurant, results] = await Promise.all([
    getRestaurant(membership.restaurantId),
    getRestaurantShareResults(membership.restaurantId, days),
  ]);
  const name = restaurant?.name?.trim() || "Mon restaurant";
  const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "restaurant";

  return (
    <div className="space-y-5">
      <CampaignsSubNav />
      <PageHeader
        eyebrow="Marketing"
        title={t("shareMyResults")}
        description={t("createAVisualOr")}
      />
      <nav aria-label={t("period")} className="flex gap-2">
        {SHARE_PERIODS.map((option) => (
          <Link
            key={option}
            href={`/campaigns/resultats?jours=${option}`}
            aria-current={option === days ? "page" : undefined}
            className={
              option === days
                ? "rounded-lg border border-mv-green bg-mv-green/10 px-3 py-1.5 text-[12.5px] font-medium text-mv-green-dark"
                : "rounded-lg border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-medium text-mv-ink-soft hover:bg-mv-cream-soft"
            }
          >
            {option} jours
          </Link>
        ))}
      </nav>
      <ResultsShareStudio
        key={days}
        metrics={restaurantShareMetrics(results)}
        defaultHeadline={`Ce que nos clients font chez ${name}`}
        defaultSubtitle=""
        fileBase={`resultats-${slug}`}
        emptyTitle={t("noResultsToShare")}
        emptyHint={t("asSoonAsCustomers")}
      />
    </div>
  );
}

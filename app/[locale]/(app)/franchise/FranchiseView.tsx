"use client";


import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { MenuImageUpload } from "@/components/menu/MenuImageUpload";
import { formatCurrency } from "@/lib/utils";
import { notifyError } from "@/lib/notify-error";
import { updateWorkspaceLogoAction } from "./actions";
import type { LtvImpactRollup } from "@/lib/engine/impact";
import type { Restaurant, Workspace } from "@/lib/types";
import { DollarSign, TrendingUp, Repeat, Building2 } from "lucide-react";

/**
 * The shared brand image shown on the native app's "other locations"
 * carousel (MenuView.swift's franchiseCardImage) — one per workspace since
 * it represents the brand, not any single restaurant. Reuses
 * MenuImageUpload with a dedicated bucket rather than piggybacking on a
 * restaurant's own image_urls, which wouldn't make sense for a value
 * shared across every location.
 */
function WorkspaceLogoCard({ workspace }: { workspace: Workspace }) {
  const t = useTranslations("franchiseView");
  const [logoUrl, setLogoUrl] = useState(workspace.logoUrl);

  async function handleUploaded(url: string) {
    const ok = await updateWorkspaceLogoAction(workspace.id, url);
    if (ok) {
      setLogoUrl(url);
      toast.success(t("brandImageUpdated"));
    } else {
      notifyError(t("couldNotUpdateThe"));
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader
        eyebrow={t("branding")}
        title={t("yourFranchiseLogo")}
        description={t("shownOnEachLocation")}
      />
      <MenuImageUpload
        restaurantId={workspace.id}
        scopeId="logo"
        bucket="workspace-logos"
        currentUrl={logoUrl}
        onUploaded={handleUploaded}
      />
    </Card>
  );
}

export function FranchiseView({
  restaurants,
  rollup,
  monthRevenue,
  workspace,
}: {
  restaurants: Restaurant[];
  rollup: LtvImpactRollup | null;
  monthRevenue: number;
  workspace: Workspace | null;
}) {
  const locale = useLocale();
  const t = useTranslations("franchiseView");
  if (!rollup) {
    return (
      <div>
        <PageHeader eyebrow={t("franchise")} title={t("franchiseView")} />
        {workspace && <WorkspaceLogoCard workspace={workspace} />}
        <EmptyState
          icon={Building2}
          title={t("onlyOneRestaurantFor")}
          description={t("theFranchiseViewBrings")}
        />
      </div>
    );
  }

  const touchedShare =
    rollup.visitFrequency.multiplier > 0
      ? (rollup.visitFrequency.touchedPerMonth / (rollup.visitFrequency.touchedPerMonth + rollup.visitFrequency.untouchedPerMonth || 1)) * 100
      : 0;

  return (
    <div>
      <PageHeader
        eyebrow={t("franchise")}
        title={t("franchiseView")}
        description={t("combinedResultsAcrossRestaurantcount", { restaurantCount: rollup.restaurantCount })}
      />

      {workspace && <WorkspaceLogoCard workspace={workspace} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <RadialGauge
            value={monthRevenue ? (rollup.totalIncrementalRevenue / monthRevenue) * 100 : 0}
            color="var(--mv-green)"
            centerValue={`${monthRevenue ? Math.round((rollup.totalIncrementalRevenue / monthRevenue) * 100) : 0}%`}
            centerLabel={t("ofTheMonth")}
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <DollarSign size={13} /> {t("salesFromLoyalty")}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-mv-ink-faint">
              {t("extraPurchasesGeneratedBy")}
            </p>
            <p className="mt-1 font-display text-[17px] font-medium text-mv-ink">
              {formatCurrency(rollup.totalIncrementalRevenue, locale)}
            </p>
            <p className="mt-0.5 text-[12px] text-mv-ink-soft">{t("allRestaurantsCombined")}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <RadialGauge
            value={rollup.avgActiveMarginPct}
            color="var(--mv-green)"
            centerValue={`${rollup.avgActiveMarginPct.toFixed(0)}%`}
            centerLabel="marge"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <TrendingUp size={13} /> {t("activeMenuMargin")}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-mv-ink-faint">
              {t("marginOfWhatIs")}
            </p>
            <p className="mt-1 text-[12px] text-mv-ink-soft">
              {rollup.avgMarginGainPct >= 0 ? "+" : ""}
              {rollup.avgMarginGainPct.toFixed(1)} pt en moyenne
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <RadialGauge
            value={touchedShare}
            color="var(--mv-lime-dark)"
            centerValue={rollup.visitFrequency.multiplier > 0 ? `×${rollup.visitFrequency.multiplier.toFixed(1)}` : "—"}
            centerLabel="plus souvent"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <Repeat size={13} /> Reviennent plus souvent
            </p>
            <p className="mt-1 text-[12px] leading-snug text-mv-ink-faint">
              {t("customersReachedByA")}
            </p>
            <p className="mt-1 text-[12px] text-mv-ink-soft">{t("weightedAverageAcrossAll")}</p>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader eyebrow={t("detail")} title={t("byRestaurant")} />
          <Table>
            <THead>
              <Tr>
                <Th>{t("restaurant")}</Th>
                <Th>{t("salesFromLoyalty")}</Th>
                <Th>{t("activeMenuMargin")}</Th>
                <Th>{t("comeBack")}</Th>
              </Tr>
            </THead>
            <tbody>
              {rollup.perRestaurant.map((impact) => {
                const restaurant = restaurants.find((r) => r.id === impact.restaurantId);
                return (
                  <Tr key={impact.restaurantId}>
                    <Td className="font-medium text-mv-ink">{restaurant?.name ?? "—"}</Td>
                    <Td>{formatCurrency(impact.incrementalRevenue, locale)}</Td>
                    <Td>
                      {impact.marginGainPct >= 0 ? "+" : ""}
                      {impact.marginGainPct.toFixed(1)} pt
                    </Td>
                    <Td>{impact.visitFrequency.multiplier > 0 ? `×${impact.visitFrequency.multiplier.toFixed(1)}` : "—"}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

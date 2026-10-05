"use client";


import { useLocale, useTranslations } from "next-intl";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { DistributionDonut } from "@/components/charts/DistributionDonut";
import { FlowBars } from "@/components/charts/FlowBars";
import { formatCurrency } from "@/lib/utils";
import type { ReferralRoiMetrics, TopAmbassador } from "@/lib/data/referral-roi";
import { TrendingUp, Users, MousePointerClick, DollarSign, Trophy } from "lucide-react";

export function ReferralRoiDashboard({
  metrics,
  ambassadors,
}: {
  metrics: ReferralRoiMetrics;
  ambassadors: TopAmbassador[];
}) {
  const t = useTranslations("referralRoi");
  const locale = useLocale();
  return (
    <div className="space-y-6">
      {/* Top Level KPIs, each with a visual to show the effect, not just the number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">{t("referredRevenue")}</span>
            <span className="rounded-lg bg-mv-green-tint p-1.5 text-mv-green-dark">
              <DollarSign size={14} />
            </span>
          </div>
          <p className="mb-3 font-display text-[20px] font-semibold text-mv-ink">
            {formatCurrency(metrics.totalRevenueGenerated, locale)}
          </p>
          <FlowBars
            lines={[
              {
                label: "Revenu",
                amount: metrics.totalRevenueGenerated,
                pct: metrics.totalRevenueGenerated > 0 ? 100 : 0,
              },
              {
                label: t("rewardCost"),
                amount: metrics.estimatedRewardsCost,
                pct:
                  metrics.totalRevenueGenerated > 0
                    ? Math.min(100, (metrics.estimatedRewardsCost / metrics.totalRevenueGenerated) * 100)
                    : 0,
              },
            ]}
          />
        </div>

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">{t("roiMultiplier")}</span>
            <span className="rounded-lg bg-mv-lime-tint p-1.5 text-mv-green-darker">
              <TrendingUp size={14} />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <RadialGauge
              value={
                metrics.totalRevenueGenerated > 0
                  ? Math.max(0, Math.min(100, (metrics.netProfitGenerated / metrics.totalRevenueGenerated) * 100))
                  : 0
              }
              size={72}
              strokeWidth={8}
              color="var(--mv-green)"
              centerValue={metrics.roiMultiplier > 0 ? `${metrics.roiMultiplier}x` : "—"}
              centerLabel={metrics.roiMultiplier > 0 ? t("cost") : t("soon")}
            />
            <div className="min-w-0">
              {metrics.roiMultiplier > 0 && metrics.totalRevenueGenerated > 0 && (
                <Badge tone="lime" size="xs">
                  Net +{formatCurrency(metrics.netProfitGenerated, locale)}
                </Badge>
              )}
              <p
                className={
                  metrics.roiMultiplier > 0
                    ? "mt-1.5 text-[12px] leading-snug text-mv-ink-soft"
                    : metrics.totalRevenueGenerated > 0
                      ? "text-[12.5px] font-medium leading-snug text-mv-ink"
                      : "mt-1.5 text-[12px] leading-snug text-mv-ink-soft"
                }
              >
                {metrics.roiMultiplier > 0
                  ? t("netReturnPerDollar")
                  : metrics.totalRevenueGenerated > 0
                    ? t("rewardsNotClaimedYet")
                    : t("netReturnPerDollar")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">{t("conversionRate")}</span>
            <span className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600">
              <MousePointerClick size={14} />
            </span>
          </div>
          <DistributionDonut
            size={92}
            data={[
              { label: "Convertis", value: metrics.totalConversions, color: "var(--mv-green)" },
              {
                label: t("clicksWithoutConversion"),
                value: Math.max(0, metrics.totalClicks - metrics.totalConversions),
                color: "var(--mv-border)",
              },
            ]}
          />
          <p className="mt-2 text-[12px] text-mv-ink-soft">{metrics.conversionRatePct}% de taux de conversion</p>
        </div>

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">{t("activeAmbassadors")}</span>
            <span className="rounded-lg bg-purple-500/10 p-1.5 text-purple-600">
              <Users size={14} />
            </span>
          </div>
          <p className="mb-3 font-display text-[20px] font-semibold text-mv-ink">{metrics.activeAmbassadorsCount}</p>
          {ambassadors.length > 0 ? (
            <FlowBars
              tone="ink"
              lines={ambassadors.slice(0, 3).map((a) => ({
                label: a.customerName,
                amount: a.revenueGenerated,
                pct:
                  ambassadors[0].revenueGenerated > 0
                    ? Math.max(4, (a.revenueGenerated / ambassadors[0].revenueGenerated) * 100)
                    : 0,
              }))}
            />
          ) : (
            <p className="text-[12px] text-mv-ink-soft">{t("customersActivelySharing")}</p>
          )}
        </div>
      </div>

      {/* Top Ambassadors Leaderboard */}
      <Card>
        <CardHeader
          eyebrow={t("wordOfMouth")}
          title="Classement des Meilleurs Ambassadeurs"
          description={t("yourMostInfluentialCustomers")}
          action={
            <Badge tone="green" size="sm">
              <Trophy size={12} className="mr-1 inline" /> Top {ambassadors.length}
            </Badge>
          }
        />

        {ambassadors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mv-border-soft p-6 text-center text-[12.5px] text-mv-ink-faint">
            {t("noActiveReferralRecorded")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-mv-border-soft bg-mv-cream-soft text-[12px] font-semibold uppercase text-mv-ink-faint">
                  <th className="py-2.5 px-3">{t("rank")}</th>
                  <th className="py-2.5 px-3">{t("ambassador")}</th>
                  <th className="py-2.5 px-3 text-center">{t("clicks")}</th>
                  <th className="py-2.5 px-3 text-center">{t("convertedReferrals")}</th>
                  <th className="py-2.5 px-3 text-right">{t("revenueBrought")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mv-border-soft">
                {ambassadors.map((a, idx) => (
                  <tr key={a.customerId} className="hover:bg-mv-cream-soft/50 transition-colors">
                    <td className="py-2.5 px-3">
                      {idx === 0 ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[12px] font-bold text-white shadow-sm">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-[12px] font-bold text-gray-700 shadow-sm">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-700/60 text-[12px] font-bold text-white shadow-sm">
                          3
                        </span>
                      ) : (
                        <span className="text-mv-ink-faint font-semibold">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-mv-ink">{a.customerName}</p>
                      {a.customerEmail && <p className="text-[12px] text-mv-ink-faint truncate max-w-[180px]">{a.customerEmail}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center text-mv-ink-soft">{a.referralClicks}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-mv-green-dark">{a.referralConversions}</td>
                    <td className="py-2.5 px-3 text-right font-display font-semibold text-mv-ink">
                      {formatCurrency(a.revenueGenerated, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

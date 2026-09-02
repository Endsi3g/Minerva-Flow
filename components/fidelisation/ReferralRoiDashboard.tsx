"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
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
  return (
    <div className="space-y-6">
      {/* Top Level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">Revenu Filleuls</span>
            <span className="rounded-lg bg-mv-green-tint p-1.5 text-mv-green-dark">
              <DollarSign size={14} />
            </span>
          </div>
          <p className="mt-2 font-display text-[22px] font-semibold text-mv-ink">
            {formatCurrency(metrics.totalRevenueGenerated)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-mv-ink-soft">
            <span>Coût récompenses : {formatCurrency(metrics.estimatedRewardsCost)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">Multiplicateur ROI</span>
            <span className="rounded-lg bg-mv-lime-tint p-1.5 text-mv-green-darker">
              <TrendingUp size={14} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-[22px] font-semibold text-mv-green-darker">
              {metrics.roiMultiplier > 0
                ? `${metrics.roiMultiplier}x`
                : metrics.totalRevenueGenerated > 0
                  ? "Coût $0"
                  : "—"}
            </span>
            {metrics.totalRevenueGenerated > 0 && (
              <Badge tone="lime" size="xs">
                Net +{formatCurrency(metrics.netProfitGenerated)}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[11.5px] text-mv-ink-soft">
            {metrics.roiMultiplier > 0
              ? "Rendement net par dollar investi"
              : metrics.totalRevenueGenerated > 0
                ? "Récompenses pas encore réclamées — coût réel à venir"
                : "Rendement net par dollar investi"}
          </p>
        </div>

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">Taux de Conversion</span>
            <span className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600">
              <MousePointerClick size={14} />
            </span>
          </div>
          <p className="mt-2 font-display text-[22px] font-semibold text-mv-ink">
            {metrics.conversionRatePct}%
          </p>
          <p className="mt-1 text-[11.5px] text-mv-ink-soft">
            {metrics.totalConversions} convertis sur {metrics.totalClicks} clics
          </p>
        </div>

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">Ambassadeurs Actifs</span>
            <span className="rounded-lg bg-purple-500/10 p-1.5 text-purple-600">
              <Users size={14} />
            </span>
          </div>
          <p className="mt-2 font-display text-[22px] font-semibold text-mv-ink">
            {metrics.activeAmbassadorsCount}
          </p>
          <p className="mt-1 text-[11.5px] text-mv-ink-soft">
            Clients qui partagent activement
          </p>
        </div>
      </div>

      {/* Top Ambassadors Leaderboard */}
      <Card>
        <CardHeader
          eyebrow="Bouche-à-Oreille"
          title="Classement des Meilleurs Ambassadeurs"
          description="Vos clients les plus influents qui génèrent le plus de nouveaux clients et de chiffre d'affaires."
          action={
            <Badge tone="green" size="sm">
              <Trophy size={12} className="mr-1 inline" /> Top {ambassadors.length}
            </Badge>
          }
        />

        {ambassadors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mv-border-soft p-6 text-center text-[12.5px] text-mv-ink-faint">
            Aucun parrainage actif enregistré pour le moment. Partagez les affiches de table QR Code pour lancer la viralité !
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-mv-border-soft bg-mv-cream-soft text-[11px] font-semibold uppercase text-mv-ink-faint">
                  <th className="py-2.5 px-3">Rang</th>
                  <th className="py-2.5 px-3">Ambassadeur</th>
                  <th className="py-2.5 px-3 text-center">Clics</th>
                  <th className="py-2.5 px-3 text-center">Filleuls Convertis</th>
                  <th className="py-2.5 px-3 text-right">CA Apporté</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mv-border-soft">
                {ambassadors.map((a, idx) => (
                  <tr key={a.customerId} className="hover:bg-mv-cream-soft/50 transition-colors">
                    <td className="py-2.5 px-3">
                      {idx === 0 ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-white shadow-sm">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-[11px] font-bold text-gray-700 shadow-sm">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-700/60 text-[11px] font-bold text-white shadow-sm">
                          3
                        </span>
                      ) : (
                        <span className="text-mv-ink-faint font-semibold">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-mv-ink">{a.customerName}</p>
                      {a.customerEmail && <p className="text-[11px] text-mv-ink-faint truncate max-w-[180px]">{a.customerEmail}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center text-mv-ink-soft">{a.referralClicks}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-mv-green-dark">{a.referralConversions}</td>
                    <td className="py-2.5 px-3 text-right font-display font-semibold text-mv-ink">
                      {formatCurrency(a.revenueGenerated)}
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

"use client";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { estimateMargin } from "@/lib/prospects/margin";
import type { Prospect, ProspectStatus } from "@/lib/prospects/types";
import { Store, Eye, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

const statusTone: Record<ProspectStatus, "amber" | "neutral" | "green" | "red" | "lime" | "blue" | "purple"> = {
  draft: "neutral",
  nouveau: "purple",
  ready: "lime",
  contacte: "amber",
  audit_envoye: "blue",
  relance_1: "amber",
  relance_2: "purple",
  rdv_fixe: "lime",
  converti: "green",
  decline: "red",
};

export function ProspectsListView({ prospects }: { prospects: Prospect[] }) {
  const t = useTranslations("admin.prospects");
  const tStatus = useTranslations("admin.prospects.status");

  if (prospects.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-mv-border bg-mv-cream-soft">
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              {t("colRestaurant")}
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              {t("colStatus")}
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              {t("colEstimatedLoss")}
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              {t("colViews")}
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              {t("colCreatedAt")}
            </th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((p) => {
            const margin = estimateMargin(p.menu, p.commissionRatePct, p.assumedMonthlyOrders);
            return (
              <tr key={p.id} className="border-b border-mv-border-soft last:border-0 hover:bg-mv-cream-soft/60">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/prospects/${p.id}`}
                    className="flex items-center gap-2 font-semibold text-mv-ink hover:text-mv-green-dark"
                  >
                    <Store size={14} className="text-mv-ink-faint" /> {p.restaurantName || t("untitled")}
                  </Link>
                  {p.contactName && (
                    <p className="mt-0.5 pl-[22px] text-[11.5px] text-mv-ink-faint">{p.contactName}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[p.status]}>{tStatus(p.status)}</Badge>
                </td>
                <td className="px-4 py-3 text-mv-ink-soft">
                  {margin.monthlyLossCents > 0 ? `${formatCurrency(margin.monthlyLossCents / 100)}/mois` : "—"}
                </td>
                <td className="px-4 py-3 text-mv-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} className="text-mv-ink-faint" /> {p.demoViewCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-mv-ink-soft">{formatDate(p.createdAt.slice(0, 10))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

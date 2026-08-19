"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/minerva/FormField";
import { formatCurrency } from "@/lib/utils";
import { estimateMargin } from "@/lib/prospects/margin";
import { getDemoUrl } from "@/lib/prospects/demo-url";
import type { Prospect, ProspectStatus } from "@/lib/prospects/types";
import { Link2, ExternalLink, Copy, Mail, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

function buildPitchMessage(
  prospect: Prospect,
  demoUrl: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string
) {
  const firstItem = prospect.menu.categories.flatMap((c) => c.items).find((i) => i.priceCents > 0);
  const itemName = firstItem?.name ?? t("genericItem");
  const itemPrice = firstItem ? formatCurrency(firstItem.priceCents / 100) : formatCurrency(0);
  const itemCommission = firstItem
    ? formatCurrency((firstItem.priceCents * (prospect.commissionRatePct / 100)) / 100)
    : formatCurrency(0);

  return t("pitchTemplate", {
    restaurantName: prospect.restaurantName,
    itemName,
    itemPrice,
    commission: itemCommission,
    demoUrl,
  });
}

async function copyToClipboard(text: string, onSuccess: () => void, onError: () => void) {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess();
  } catch {
    onError();
  }
}

const statusOptions: ProspectStatus[] = ["draft", "ready", "contacte", "converti", "decline"];

export function OutboundHub({
  prospect,
  onStatusChange,
}: {
  prospect: Prospect;
  onStatusChange: (status: ProspectStatus) => Promise<boolean>;
}) {
  const t = useTranslations("admin.prospects.outbound");
  const tStatus = useTranslations("admin.prospects.status");
  const [status, setStatus] = useState(prospect.status);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const demoUrl = prospect.demoSlug ? getDemoUrl(prospect.demoSlug) : null;
  const margin = useMemo(
    () => estimateMargin(prospect.menu, prospect.commissionRatePct, prospect.assumedMonthlyOrders),
    [prospect.menu, prospect.commissionRatePct, prospect.assumedMonthlyOrders]
  );
  const pitchMessage = useMemo(
    () => (demoUrl ? buildPitchMessage(prospect, demoUrl, t) : ""),
    [prospect, demoUrl, t]
  );

  async function handleStatusChange(next: ProspectStatus) {
    setStatus(next);
    setIsChangingStatus(true);
    try {
      await onStatusChange(next);
    } finally {
      setIsChangingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
        <p className="mb-3 font-display text-[15px] font-medium text-mv-ink">{t("linksTitle")}</p>
        {demoUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-mv-border-soft bg-mv-cream-soft px-3 py-2">
              <Link2 size={14} className="shrink-0 text-mv-ink-faint" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-mv-ink-soft">{demoUrl}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() =>
                  copyToClipboard(
                    demoUrl,
                    () => toast.success(t("linkCopied")),
                    () => toast.error(t("copyFailed"))
                  )
                }
              >
                <Copy data-icon="inline-start" size={13} />
                {t("copyLink")}
              </Button>
              <Button size="sm" variant="outline" href={demoUrl}>
                <ExternalLink data-icon="inline-start" size={13} />
                {t("openDemo")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[12.5px] text-mv-ink-faint">{t("noLinkYet")}</p>
        )}
      </div>

      <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
        <p className="mb-1 font-display text-[15px] font-medium text-mv-ink">{t("pitchTitle")}</p>
        <p className="mb-3 text-[12px] text-mv-ink-faint">{t("pitchHint")}</p>
        <textarea
          readOnly
          value={pitchMessage}
          rows={5}
          className="w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-mv-ink-soft outline-none"
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={!pitchMessage}
            onClick={() =>
              copyToClipboard(
                pitchMessage,
                () => toast.success(t("pitchCopied")),
                () => toast.error(t("copyFailed"))
              )
            }
          >
            <Copy data-icon="inline-start" size={13} />
            {t("copyPitch")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            href={`mailto:?subject=${encodeURIComponent(t("emailSubject", { restaurantName: prospect.restaurantName }))}&body=${encodeURIComponent(pitchMessage)}`}
          >
            <Mail data-icon="inline-start" size={13} />
            {t("sendEmail")}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
        <p className="mb-3 flex items-center gap-1.5 font-display text-[15px] font-medium text-mv-ink">
          <TrendingDown size={15} className="text-mv-red" /> {t("marginTitle")}
        </p>
        <div className="space-y-1.5 text-[12.5px]">
          <div className="flex justify-between">
            <span className="text-mv-ink-soft">{t("avgOrderValue")}</span>
            <span className="font-semibold text-mv-ink">{formatCurrency(margin.averageOrderValueCents / 100)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mv-ink-soft">{t("assumedOrders")}</span>
            <span className="font-semibold text-mv-ink">{prospect.assumedMonthlyOrders}</span>
          </div>
          <div className="flex justify-between border-t border-mv-border-soft pt-1.5">
            <span className="text-mv-ink-soft">{t("monthlyLoss")}</span>
            <span className="font-semibold text-mv-red">{formatCurrency(margin.monthlyLossCents / 100)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
        <p className="mb-2 font-display text-[15px] font-medium text-mv-ink">{t("statusTitle")}</p>
        <Select
          value={status}
          disabled={isChangingStatus}
          onChange={(e) => handleStatusChange(e.target.value as ProspectStatus)}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </Select>
        {prospect.demoViewCount > 0 && (
          <p className="mt-2 text-[11.5px] text-mv-ink-faint">
            {t("viewCount", { count: prospect.demoViewCount })}
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/minerva/FormField";
import { formatCurrency } from "@/lib/utils";
import { estimateMargin } from "@/lib/prospects/margin";
import { getDemoUrl } from "@/lib/prospects/demo-url";
import type { Prospect, ProspectStatus } from "@/lib/prospects/types";
import { sendProspectAuditEmailAction, sendProspectRelanceAction } from "./actions";
import { Link2, ExternalLink, Copy, Mail, Send, TrendingDown, Clock, Sparkles, CheckCircle2 } from "lucide-react";
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

const statusOptions: ProspectStatus[] = [
  "draft",
  "nouveau",
  "ready",
  "audit_envoye",
  "relance_1",
  "relance_2",
  "rdv_fixe",
  "converti",
  "decline",
];

export function OutboundHub({
  prospect,
  onStatusChange,
}: {
  prospect: Prospect;
  onStatusChange: (status: ProspectStatus) => Promise<boolean>;
}) {
  const t = useTranslations("admin.prospects.outbound");
  const tStatus = useTranslations("admin.prospects.status");
  const [status, setStatus] = useState<ProspectStatus>(prospect.status);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Email sending state
  const [recipientEmail, setRecipientEmail] = useState(() => {
    if (prospect.notes) {
      const match = prospect.notes.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) return match[0];
    }
    return "";
  });
  const [customNote, setCustomNote] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const demoUrl = prospect.demoSlug ? getDemoUrl(prospect.demoSlug) : null;
  const margin = useMemo(
    () => estimateMargin(prospect.menu, prospect.commissionRatePct, prospect.assumedMonthlyOrders),
    [prospect.menu, prospect.commissionRatePct, prospect.assumedMonthlyOrders]
  );
  const pitchMessage = useMemo(
    () => (demoUrl ? buildPitchMessage(prospect, demoUrl, t) : ""),
    [prospect, demoUrl, t]
  );

  // Cadence calculations
  const [daysSinceContact] = useState(() => {
    const last = prospect.contactedAt || prospect.createdAt;
    if (!last) return 0;
    return Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24));
  });

  const isRelance1Due = (status === "audit_envoye" || status === "contacte") && daysSinceContact >= 2;
  const isRelance2Due = status === "relance_1" && daysSinceContact >= 3;

  async function handleStatusChange(next: ProspectStatus) {
    setStatus(next);
    setIsChangingStatus(true);
    try {
      await onStatusChange(next);
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function handleSendAuditEmail() {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Veuillez saisir une adresse courriel valide.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await sendProspectAuditEmailAction(prospect.id, recipientEmail, customNote || undefined);
      if (res.ok) {
        toast.success(t("emailSent"));
        setStatus("audit_envoye");
      } else {
        toast.error(res.error || t("emailSendFailed"));
      }
    } catch {
      toast.error(t("emailSendFailed"));
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handleSendRelance(step: 1 | 2) {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Veuillez saisir une adresse courriel valide.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await sendProspectRelanceAction(prospect.id, step, recipientEmail, customNote || undefined);
      if (res.ok) {
        toast.success(t("emailSent"));
        setStatus(step === 1 ? "relance_1" : "relance_2");
      } else {
        toast.error(res.error || t("emailSendFailed"));
      }
    } catch {
      toast.error(t("emailSendFailed"));
    } finally {
      setIsSendingEmail(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Cadence Alert Banner if due */}
      {(isRelance1Due || isRelance2Due) && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-mv-amber/40 bg-mv-amber/10 p-4 text-[13px] text-mv-ink">
          <Clock size={16} className="shrink-0 text-mv-amber" />
          <div className="flex-1 min-w-0 font-medium">
            {isRelance1Due && t("dueRelance1")}
            {isRelance2Due && t("dueRelance2")}
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={isSendingEmail || !recipientEmail}
            onClick={() => handleSendRelance(isRelance1Due ? 1 : 2)}
          >
            <Send data-icon="inline-start" size={12} />
            Relancer
          </Button>
        </div>
      )}

      {/* Links Box */}
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

      {/* Email Sender & Relance Hub */}
      <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-display text-[15px] font-medium text-mv-ink flex items-center gap-1.5">
            <Mail size={15} className="text-mv-green" /> Envoi & Relances directes
          </p>
          <span className="text-[11.5px] text-mv-ink-faint">Resend Pro</span>
        </div>

        <div>
          <label className="mb-1 block text-[11.5px] font-medium text-mv-ink-soft">Courriel du destinataire</label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder={t("recipientEmailPlaceholder")}
            className="w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3 py-2 text-[12.5px] text-mv-ink outline-none focus:border-mv-green"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11.5px] font-medium text-mv-ink-soft">Note ou angle spécifique (facultatif)</label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Ex. Discussion du menu du midi, offre spéciale rentrée..."
            className="w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3 py-2 text-[12px] text-mv-ink outline-none focus:border-mv-green"
          />
        </div>

        <div className="pt-1 flex flex-col gap-2">
          <Button
            size="sm"
            disabled={isSendingEmail || !recipientEmail}
            onClick={handleSendAuditEmail}
            className="w-full"
          >
            <Send data-icon="inline-start" size={13} />
            {isSendingEmail ? t("sendingEmail") : t("sendDirectAudit")}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={isSendingEmail || !recipientEmail}
              onClick={() => handleSendRelance(1)}
              className="text-[11.5px]"
            >
              <Sparkles data-icon="inline-start" size={12} />
              {t("sendRelance1")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isSendingEmail || !recipientEmail}
              onClick={() => handleSendRelance(2)}
              className="text-[11.5px]"
            >
              <CheckCircle2 data-icon="inline-start" size={12} />
              {t("sendRelance2")}
            </Button>
          </div>
        </div>
      </div>

      {/* Pitch Script */}
      <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
        <p className="mb-1 font-display text-[15px] font-medium text-mv-ink">{t("pitchTitle")}</p>
        <p className="mb-3 text-[12px] text-mv-ink-faint">{t("pitchHint")}</p>
        <textarea
          readOnly
          value={pitchMessage}
          rows={4}
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

      {/* Margin simulation */}
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

      {/* Status */}
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

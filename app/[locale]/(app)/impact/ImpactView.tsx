"use client";


import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/minerva/FormField";
import { formatCurrency } from "@/lib/utils";
import { notifyError } from "@/lib/notify-error";
import { sendManualRetentionNudgeAction, shareImpactResultsAction } from "./actions";
import type { LtvImpact } from "@/lib/engine/impact";
import type { AtRiskCustomer } from "@/lib/data/impact";
import { DollarSign, TrendingUp, Repeat, Users, Send, Clock, TrendingDown, Gift, Share2, UtensilsCrossed, ArrowRight } from "lucide-react";

const triggerLabel_KEYS: Record<AtRiskCustomer["trigger"], string> = {
  inactivity: "triggerlabelInactivity",
  value_drift: "triggerlabelValueDrift",
  birthday: "triggerlabelBirthday",
  reward_available: "triggerlabelRewardAvailable",
};

const triggerIcon: Record<AtRiskCustomer["trigger"], typeof Clock> = {
  inactivity: Clock,
  value_drift: TrendingDown,
  birthday: Clock,
  reward_available: Gift,
};

export function ImpactView({
  restaurantName,
  impact,
  monthRevenue,
  atRiskCustomers,
  retentionEngineEnabled,
}: {
  restaurantName: string | null;
  impact: LtvImpact | null;
  monthRevenue: number;
  atRiskCustomers: AtRiskCustomer[];
  retentionEngineEnabled: boolean;
}) {
  const t = useTranslations("impactView");
  if (!impact) {
    return (
      <div>
        <PageHeader eyebrow={t("loyaltyResults")} title={t("whatLoyaltyEarnsYou")} />
        <EmptyState
          icon={TrendingUp}
          title={t("noRestaurantSelected")}
          description={t("chooseARestaurantTo")}
        />
      </div>
    );
  }

  const { visitFrequency } = impact;
  const hasEnoughData = visitFrequency.hasEnoughSignal;
  const touchedShare = hasEnoughData
    ? (visitFrequency.touchedPerMonth / (visitFrequency.touchedPerMonth + visitFrequency.untouchedPerMonth || 1)) * 100
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow={t("loyaltyResults")}
        title={t("whatLoyaltyEarnsYou")}
        description={
          restaurantName
            ? t("whatYourAutomaticNudges2", { restaurantName })
            : t("whatYourAutomaticNudges")
        }
        action={<ShareResultsButton incrementalRevenue={impact.incrementalRevenue} />}
      />

      <ActionableCustomersCard retentionEngineEnabled={retentionEngineEnabled} initialCustomers={atRiskCustomers} />

      <AlertBanner tone="info" title={t("howToReadThe")} className="mb-6 mt-6">
        {t("howToReadBody")}
      </AlertBanner>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <RadialGauge
            value={monthRevenue ? (impact.incrementalRevenue / monthRevenue) * 100 : 0}
            color="var(--mv-green)"
            centerValue={`${monthRevenue ? Math.round((impact.incrementalRevenue / monthRevenue) * 100) : 0}%`}
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
              {formatCurrency(impact.incrementalRevenue)}
            </p>
            <p className="mt-0.5 text-[12px] text-mv-ink-soft">{t("visitsWithin14Days")}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          {impact.hasMenuMarginData ? (
            <RadialGauge
              value={impact.activeMarginPct}
              color="var(--mv-green)"
              centerValue={`${impact.activeMarginPct.toFixed(0)}%`}
              centerLabel={t("marginWord")}
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-faint">
              <UtensilsCrossed size={22} />
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <TrendingUp size={13} /> {t("activeMenuMargin")}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-mv-ink-faint">
              {t("marginOfWhatIs")}
            </p>
            {impact.hasMenuMarginData ? (
              <p className="mt-1 text-[12px] text-mv-ink-soft">
                {impact.marginGainPct >= 0 ? "+" : ""}
                {t("marginGainLine", { pct: impact.marginGainPct.toFixed(1) })}
              </p>
            ) : (
              <Link href="/menu" className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark">
                {t("addYourDishesAnd")}
                <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <RadialGauge
            value={touchedShare}
            color="var(--mv-lime-dark)"
            centerValue={hasEnoughData ? `×${visitFrequency.multiplier.toFixed(1)}` : "—"}
            centerLabel={t("moreOften")}
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <Repeat size={13} /> Reviennent plus souvent
            </p>
            <p className="mt-1 text-[12px] leading-snug text-mv-ink-faint">
              {t("customersReachedByA")}
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            eyebrow={t("detail")}
            title={t("howOftenYourCustomers")}
            description={t("averageNumberOfVisits")}
          />
          {hasEnoughData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-mv-green/20 bg-mv-green-tint p-4">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-mv-green-dark">
                  <Users size={13} /> {t("receivedNudge")}
                </p>
                <p className="mt-1 font-display text-[24px] font-medium text-mv-green-darker">
                  {visitFrequency.touchedPerMonth.toFixed(2)} <span className="text-[13px] font-normal">{t("visitsMonth")}</span>
                </p>
                <p className="mt-1 text-[12px] text-mv-ink-soft">{visitFrequency.touchedCount} client(s)</p>
              </div>
              <div className="rounded-xl border border-mv-border bg-mv-cream-soft p-4">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  <Users size={13} /> {t("neverReceived")}
                </p>
                <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
                  {visitFrequency.untouchedPerMonth.toFixed(2)} <span className="text-[13px] font-normal">{t("visitsMonth")}</span>
                </p>
                <p className="mt-1 text-[12px] text-mv-ink-soft">{visitFrequency.untouchedCount} client(s)</p>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-mv-ink-faint">
              {t("notEnoughData")}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function ShareResultsButton({ incrementalRevenue }: { incrementalRevenue: number }) {
  const t = useTranslations("impactView");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function handleShare() {
    setSending(true);
    try {
      const ok = await shareImpactResultsAction(incrementalRevenue, note);
      if (ok) {
        toast.success(t("resultsSharedWithThe"));
        setOpen(false);
        setNote("");
      } else {
        notifyError(t("sharingFailed"));
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Share2 size={14} /> {t("shareWithTeam")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("shareWithTheTeam")}
        description={t("sendsANotificationTo")}
      >
        <div className="space-y-4">
          <Field label={t("message")} hint={t("optional")}>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("eGAmountGenerated", { amount: formatCurrency(incrementalRevenue) })}
            />
          </Field>
          <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={handleShare} disabled={sending}>
              {sending ? t("sending") : "Partager"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ActionableCustomersCard({
  retentionEngineEnabled,
  initialCustomers,
}: {
  retentionEngineEnabled: boolean;
  initialCustomers: AtRiskCustomer[];
}) {
  const t = useTranslations("impactView");
  const [customers, setCustomers] = useState(initialCustomers);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function handleSend(customerId: string, trigger: AtRiskCustomer["trigger"]) {
    setSendingId(customerId);
    try {
      const result = await sendManualRetentionNudgeAction(customerId, trigger);
      if (result.ok) {
        toast.success(t("nudgeSent"));
        setCustomers((prev) => prev.filter((c) => c.customer.id !== customerId));
      } else {
        notifyError(t("sendingFailedCheckThat"));
      }
    } finally {
      setSendingId(null);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader
        eyebrow={t("toDoToday")}
        title={t("customersToNudgeNow")}
        description={t("theseCustomersContributeDirectly")}
      />
      {!retentionEngineEnabled ? (
        <p className="text-[12.5px] text-mv-ink-faint">
          {t.rich("retentionOffRich", {
            link: (chunks) => (
              <Link href="/fidelisation" className="font-semibold text-mv-green-dark hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : customers.length === 0 ? (
        <p className="text-[12.5px] text-mv-ink-faint">
          {t.rich("noneToNudgeRich", {
            link: (chunks) => (
              <Link href="/fidelisation" className="font-semibold text-mv-green-dark hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : (
        <div className="space-y-1.5">
          {customers.map(({ customer, trigger }) => {
            const Icon = triggerIcon[trigger];
            return (
              <div
                key={customer.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-mv-border-soft px-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link href={`/fidelisation/${customer.id}`} className="text-[13px] font-semibold text-mv-ink hover:underline">
                    {customer.name}
                  </Link>
                  <p className="flex items-center gap-1.5 text-[12px] text-mv-ink-faint">
                    <Icon size={12} /> {t(triggerLabel_KEYS[trigger])}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="neutral">{t("amountSpent", { amount: formatCurrency(customer.totalSpent) })}</Badge>
                  <Button
                    size="xs"
                    onClick={() => handleSend(customer.id, trigger)}
                    disabled={sendingId === customer.id}
                  >
                    <Send size={12} />
                    {sendingId === customer.id ? t("sending") : "Relancer"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

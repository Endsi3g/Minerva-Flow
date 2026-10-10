"use client";


import { useTranslations, useLocale } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { CancelSubscriptionCard } from "@/components/billingsdk/cancel-subscription-card";
import { InvoiceHistory } from "@/components/billingsdk/invoice-history";
import { Modal } from "@/components/ui/Modal";
import { EditorialLoadingState } from "@/components/ui/EditorialLoadingState";
import {
  createBillingPortalSessionAction,
  getBillingStatusAction,
  cancelSubscriptionAction,
  resumeSubscriptionAction,
  listInvoicesAction,
  type CancellationReason,
  type InvoiceListItem,
} from "./actions";
import { plans as billingSdkPlans } from "@/lib/billingsdk-config";
import { PLANS } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Stripe } from "@/components/ui/BrandIcons";
import { toast } from "sonner";
import { CheckCircle2, Sparkles } from "lucide-react";
import { type PlanTier } from "@/lib/ai/quotas";

function buildINCLUDED_FEATURES(t: (key: string) => string) {
  return [
  t("unlimitedFinanceInventoryAnd"),
  t("directOrdering0Commission"),
  t("flowAiPoweredBy"),
  t("unlimitedRestaurantsAndTeam"),
];
}

function buildREASON_OPTIONS(t: (key: string) => string): { value: CancellationReason; label: string }[] {
  return [
  { value: "too_expensive", label: t("tooExpensiveForMy") },
  { value: "missing_features", label: t("itLacksFeaturesI") },
  { value: "switching_tool", label: t("iMSwitchingTo") },
  { value: "closing_business", label: t("iMClosingMy") },
  { value: "other", label: t("otherReason") },
];
}

function buildStatusLabel(t: (key: string) => string): Record<string, string> {
  return {
  incomplete: t("incomplete"),
  trialing: t("trialPeriod"),
  active: t("active"),
  past_due: t("paymentOverdue"),
  canceled: t("cancelled"),
  unpaid: t("unpaid"),
};
}

const statusTone: Record<string, "green" | "amber" | "red" | "neutral"> = {
  incomplete: "neutral",
  trialing: "amber",
  active: "green",
  past_due: "red",
  canceled: "neutral",
  unpaid: "red",
};

type BillingStatus = Awaited<ReturnType<typeof getBillingStatusAction>>;

export default function BillingPage() {
  const locale = useLocale();
  const t = useTranslations("billingPage");
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceListItem[] | null>(null);
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reason, setReason] = useState<CancellationReason>("too_expensive");
  const [feedback, setFeedback] = useState("");

  function refresh() {
    getBillingStatusAction().then(setStatus);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (status?.subscription) {
      listInvoicesAction().then(setInvoices);
    }
  }, [status?.subscription]);

  async function handleManage() {
    setLoading(true);
    try {
      const url = await createBillingPortalSessionAction();
      if (url) window.location.href = url;
      else toast.error(t("couldNotOpenThe"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    setLoading(true);
    const res = await resumeSubscriptionAction();
    setLoading(false);
    if (res.ok) {
      toast.success(t("yourSubscriptionContinuesAs"));
      refresh();
    } else {
      toast.error(res.error ?? t("couldNotResumeThe"));
    }
  }

  async function handleKeepSubscription() {
    await cancelSubscriptionAction({ reason, feedback: feedback.trim() || undefined, retentionOfferAccepted: true });
    toast.success(t("greatYourSubscriptionContinues"));
  }

  async function handleConfirmCancel() {
    const res = await cancelSubscriptionAction({
      reason,
      feedback: feedback.trim() || undefined,
      retentionOfferAccepted: false,
    });
    if (res.ok) {
      toast.success(t("yourSubscriptionWillBe"));
      refresh();
    } else {
      toast.error(res.error ?? t("theCancellationFailed"));
    }
  }

  const planTier = (status?.aiUsage?.planTier ?? "essentiel") as PlanTier;

  return (
    <div className="mv-billing-scope space-y-6">
      <PageHeader
        eyebrow={t("workspaceEyebrow")}
        title={t("billingTitle")}
        description={t("billingDescription")}
      />

      {status?.subscription?.status === "past_due" && (
        <AlertBanner
          tone="error"
          title="Paiement en retard"
          action={
            <Button size="sm" variant="secondary" onClick={handleManage} disabled={loading}>
              {t("updateMyCard")}
            </Button>
          }
        >
          {t("theLastPaymentFor")}
        </AlertBanner>
      )}

      {status?.cancelAtPeriodEnd && status.subscription?.currentPeriodEnd && (
        <AlertBanner
          tone="warning"
          title="Abonnement en cours d'annulation"
          action={
            <Button size="sm" variant="secondary" onClick={handleResume} disabled={loading}>
              Reprendre mon abonnement
            </Button>
          }
        >
          {t("accessEndsOn", { date: formatDate(status.subscription.currentPeriodEnd.slice(0, 10), locale) })}
        </AlertBanner>
      )}

      <div className="mx-auto max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Plan Card */}
        <Card>
          <CardHeader eyebrow="Abonnement" title="Forfait Workspace" />

          {!status ? (
            <EditorialLoadingState
              title={t("checkingTheSubscription")}
              subtitle={t("securelyQueryingThePayment")}
              rows={2}
            />
          ) : !status.configured ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-mv-green-tint/40 border border-mv-green/20 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-mv-ink">{t("freePilotPeriod")}</p>
                  <p className="mt-0.5 text-[12.5px] text-mv-ink-soft">
                    {t("billingIsNotTurned")}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">{t("includedInYourAccess")}</p>
                {buildINCLUDED_FEATURES(t).map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0 text-mv-green-dark" />
                    <span className="text-[12.5px] text-mv-ink-soft">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : status.subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stripe width={16} height={16} />
                  <span className="text-[13.5px] font-medium text-mv-ink">{t("customOfferPlanLabel")}</span>
                </div>
                <Badge tone={statusTone[status.subscription.status] ?? "neutral"}>
                  {buildStatusLabel(t)[status.subscription.status] ?? status.subscription.status}
                </Badge>
              </div>
              {status.trialEndsAt && (
                <p className="text-[12.5px] text-mv-ink-faint">
                  Essai gratuit jusqu&apos;au {formatDate(status.trialEndsAt.slice(0, 10), locale)}
                </p>
              )}
              {status.subscription.currentPeriodEnd && (
                <p className="text-[12.5px] text-mv-ink-faint">
                  {status.cancelAtPeriodEnd ? t("accessUntil") : t("nextRenewalOn")}{" "}
                  {formatDate(status.subscription.currentPeriodEnd.slice(0, 10), locale)}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button variant="secondary" className="w-full" onClick={handleManage} disabled={loading}>
                  {t("manageMySubscription")}
                </Button>
                {!status.cancelAtPeriodEnd && (
                  <Button
                    variant="ghost"
                    className="w-full text-[12.5px] text-mv-ink-faint hover:text-mv-red"
                    onClick={() => setCancelReasonOpen(true)}
                    disabled={loading}
                  >
                    {t("cancelMySubscription")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-mv-ink-soft">
                {t("youDoNotHave")}
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  window.location.href = "mailto:ventes@minervaflow.app?subject=" + encodeURIComponent("Minerva Flow — mon offre");
                }}
              >
                {t("customOfferCta")}
              </Button>
            </div>
          )}
        </Card>

        {/* Performance-based offer: no fixed price, set per establishment */}
        <Card>
          <CardHeader eyebrow={t("customOfferEyebrow")} title={t("customOfferTitle")} />
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-mv-ink-soft">{t("customOfferBody")}</p>
            <div className="space-y-2">
              {[t("customOfferPoint1"), t("customOfferPoint2"), t("customOfferPoint3")].map((point) => (
                <div key={point} className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-mv-green-dark" />
                  <span className="text-[12.5px] text-mv-ink-soft">{point}</span>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                window.location.href = "mailto:ventes@minervaflow.app?subject=" + encodeURIComponent("Minerva Flow — mon offre");
              }}
            >
              {t("customOfferCta")}
            </Button>
          </div>
        </Card>
      </div>

      {status?.subscription && invoices && invoices.length > 0 && (
        <div className="mx-auto max-w-4xl w-full">
          <InvoiceHistory invoices={invoices} />
        </div>
      )}

      {/* Step 1: exit reason (kept simple/native — the SDK dialog below owns the retention warning + final confirm) */}
      <Modal
        open={cancelReasonOpen}
        onClose={() => setCancelReasonOpen(false)}
        title={t("beforeYouGo")}
        description={t("tellUsWhy")}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {buildREASON_OPTIONS(t).map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 rounded-lg border border-mv-border px-3 py-2 text-[13px] text-mv-ink-soft has-[:checked]:border-mv-green has-[:checked]:bg-mv-green-tint/30 has-[:checked]:text-mv-ink cursor-pointer"
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={opt.value}
                  checked={reason === opt.value}
                  onChange={() => setReason(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("anythingToAddOptional")}
            rows={3}
            className="w-full rounded-lg border border-mv-border bg-mv-surface px-3 py-2 text-[13px] text-mv-ink placeholder:text-mv-ink-faint focus:outline-none focus:ring-2 focus:ring-mv-green/40"
          />
          <Button
            className="w-full"
            onClick={() => {
              setCancelReasonOpen(false);
              setCancelDialogOpen(true);
            }}
          >
            Continuer
          </Button>
        </div>
      </Modal>

      {/* Step 2: retention warning + final confirmation (Billing SDK component) —
          the Card variant renders inline with no dialog chrome of its own,
          so it drops straight into our existing Modal instead of needing a
          second, nested dialog layer. */}
      {status?.subscription && (
        <Modal
          open={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
          title={t("weReSadTo")}
          description={t("beforeConfirmingHereIs", { planTierName: PLANS[planTier].name })}
          width={720}
        >
          <CancelSubscriptionCard
            title=""
            description=""
            plan={billingSdkPlans.find((p) => p.id === planTier) ?? billingSdkPlans[0]}
            warningTitle={t("youWillLoseAccess")}
            warningText={t("atTheEndOf")}
            keepButtonText={`Garder mon plan ${PLANS[planTier].name}`}
            continueButtonText="Continuer l'annulation"
            finalTitle={t("lastStepConfirmThe")}
            finalSubtitle={t("yourAccessStaysActive")}
            finalWarningText={t("noProratedRefundIs")}
            goBackButtonText={t("waitGoBack")}
            confirmButtonText="Oui, annuler mon abonnement"
            onCancel={async () => {
              await handleConfirmCancel();
              setCancelDialogOpen(false);
            }}
            onKeepSubscription={async () => {
              await handleKeepSubscription();
              setCancelDialogOpen(false);
            }}
            className="max-w-none border-none shadow-none"
          />
        </Modal>
      )}
    </div>
  );
}

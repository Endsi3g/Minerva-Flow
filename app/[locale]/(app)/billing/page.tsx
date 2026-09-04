"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { PricingTableFive } from "@/components/billingsdk/pricing-table-five";
import { CancelSubscriptionCard } from "@/components/billingsdk/cancel-subscription-card";
import { InvoiceHistory } from "@/components/billingsdk/invoice-history";
import { ProrationPreview } from "@/components/billingsdk/proration-preview";
import { Modal } from "@/components/ui/Modal";
import {
  createCheckoutSessionAction,
  createBillingPortalSessionAction,
  getBillingStatusAction,
  changePlanAction,
  cancelSubscriptionAction,
  resumeSubscriptionAction,
  listInvoicesAction,
  type CancellationReason,
  type InvoiceListItem,
} from "./actions";
import { plans as billingSdkPlans } from "@/lib/billingsdk-config";
import { PLANS, isSelfServeTier, type SelfServePlanTier, type BillingInterval } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Stripe } from "@/components/ui/BrandIcons";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, Zap, Cpu, ArrowUpRight } from "lucide-react";
import { PLAN_NAMES, PLAN_AI_QUOTAS, type PlanTier } from "@/lib/ai/quotas";

const INCLUDED_FEATURES = [
  "Finance, inventaire et ingénierie de menu illimités",
  "Commande directe 0% commission",
  "Flow AI propulsé par Gemini 3.7 Flash",
  "Établissements et collaborateurs illimités",
];

const REASON_OPTIONS: { value: CancellationReason; label: string }[] = [
  { value: "too_expensive", label: "Trop cher pour mon budget actuel" },
  { value: "missing_features", label: "Il manque des fonctionnalités dont j'ai besoin" },
  { value: "switching_tool", label: "Je change pour un autre outil" },
  { value: "closing_business", label: "Je ferme mon établissement" },
  { value: "other", label: "Autre raison" },
];

const statusLabel: Record<string, string> = {
  incomplete: "Incomplet",
  trialing: "Période d'essai",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  unpaid: "Impayé",
};

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
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceListItem[] | null>(null);
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reason, setReason] = useState<CancellationReason>("too_expensive");
  const [feedback, setFeedback] = useState("");
  const [switchTarget, setSwitchTarget] = useState<{ tier: SelfServePlanTier; interval: BillingInterval } | null>(null);

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
  }, [status?.subscription?.stripeCustomerId]);

  async function handleSelectPlan(planId: string, interval: BillingInterval) {
    if (planId === "enterprise") {
      window.location.href =
        "mailto:ventes@minervaflow.app?subject=" + encodeURIComponent("Minerva Flow — forfait Entreprise");
      return;
    }
    if (!isSelfServeTier(planId)) return;

    setLoading(true);
    try {
      // Already subscribed (Starter <-> Pro) — switch in place with proration
      // instead of starting a second Checkout session.
      if (status?.subscription) {
        setSwitchTarget({ tier: planId, interval });
        return;
      }
      const url = await createCheckoutSessionAction(planId, interval);
      if (url) window.location.href = url;
      else toast.error("La facturation n'est pas encore configurée.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSwitch() {
    if (!switchTarget) return;
    setLoading(true);
    const res = await changePlanAction(switchTarget.tier, switchTarget.interval);
    setLoading(false);
    setSwitchTarget(null);
    if (res.ok) {
      toast.success("Votre forfait a été mis à jour.");
      refresh();
    } else {
      toast.error(res.error ?? "Le changement de forfait a échoué.");
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const url = await createBillingPortalSessionAction();
      if (url) window.location.href = url;
      else toast.error("Impossible d'ouvrir le portail de facturation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    setLoading(true);
    const res = await resumeSubscriptionAction();
    setLoading(false);
    if (res.ok) {
      toast.success("Votre abonnement continue normalement.");
      refresh();
    } else {
      toast.error(res.error ?? "Impossible de reprendre l'abonnement.");
    }
  }

  async function handleKeepSubscription() {
    await cancelSubscriptionAction({ reason, feedback: feedback.trim() || undefined, retentionOfferAccepted: true });
    toast.success("Parfait, votre abonnement continue !");
  }

  async function handleConfirmCancel() {
    const res = await cancelSubscriptionAction({
      reason,
      feedback: feedback.trim() || undefined,
      retentionOfferAccepted: false,
    });
    if (res.ok) {
      toast.success("Votre abonnement sera annulé à la fin de la période en cours.");
      refresh();
    } else {
      toast.error(res.error ?? "L'annulation a échoué.");
    }
  }

  const aiUsage = status?.aiUsage;
  const planTier = (aiUsage?.planTier ?? "starter") as PlanTier;
  const quota = aiUsage?.monthlyQuota ?? PLAN_AI_QUOTAS.starter;
  const used = aiUsage?.tokensUsed ?? 0;
  const percentUsed = Math.min(100, Math.round((used / Math.max(1, quota)) * 100));
  const currentPlanDef = PLANS[planTier];

  return (
    <div className="mv-billing-scope space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Facturation & Quotas IA"
        description="Votre abonnement Minerva Flow — gestion du forfait et consommation du moteur IA Gemini 3.7 Flash."
      />

      {status?.subscription?.status === "past_due" && (
        <AlertBanner
          tone="error"
          title="Paiement en retard"
          action={
            <Button size="sm" variant="secondary" onClick={handleManage} disabled={loading}>
              Mettre à jour ma carte
            </Button>
          }
        >
          Le dernier paiement de votre abonnement a échoué. Régularisez votre méthode de paiement pour éviter une
          interruption de service.
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
          Votre accès se termine le {formatDate(status.subscription.currentPeriodEnd.slice(0, 10))}. Changé d&apos;avis
          ?
        </AlertBanner>
      )}

      {aiUsage && aiUsage.isExceeded && (
        <AlertBanner
          tone="error"
          title="Quota Flow AI atteint"
          action={
            <Button size="sm" variant="secondary" onClick={() => document.getElementById("mv-pricing")?.scrollIntoView({ behavior: "smooth" })}>
              Passer à un forfait supérieur
            </Button>
          }
        >
          Votre quota mensuel de tokens Flow AI est atteint — l&apos;assistant IA est en pause jusqu&apos;au
          renouvellement.
        </AlertBanner>
      )}
      {aiUsage && !aiUsage.isExceeded && percentUsed >= 80 && (
        <AlertBanner tone="warning" title="Quota Flow AI bientôt atteint">
          Vous avez utilisé {percentUsed}% de votre quota mensuel de tokens Flow AI.
        </AlertBanner>
      )}

      <div className="mx-auto max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Plan Card */}
        <Card>
          <CardHeader eyebrow="Abonnement" title="Forfait Workspace" />

          {!status ? (
            <p className="text-[13px] text-mv-ink-faint">Chargement…</p>
          ) : !status.configured ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-mv-green-tint/40 border border-mv-green/20 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-mv-ink">Période pilote gratuite</p>
                  <p className="mt-0.5 text-[12.5px] text-mv-ink-soft">
                    La facturation n&apos;est pas encore activée pour votre workspace — profitez de Minerva Flow
                    gratuitement pendant votre période pilote.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">Inclus dans votre accès</p>
                {INCLUDED_FEATURES.map((feature) => (
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
                  <span className="text-[13.5px] font-medium text-mv-ink">Plan {PLAN_NAMES[planTier]}</span>
                </div>
                <Badge tone={statusTone[status.subscription.status] ?? "neutral"}>
                  {statusLabel[status.subscription.status] ?? status.subscription.status}
                </Badge>
              </div>
              {status.trialEndsAt && (
                <p className="text-[12.5px] text-mv-ink-faint">
                  Essai gratuit jusqu&apos;au {formatDate(status.trialEndsAt.slice(0, 10))}
                </p>
              )}
              {status.subscription.currentPeriodEnd && (
                <p className="text-[12.5px] text-mv-ink-faint">
                  {status.cancelAtPeriodEnd ? "Accès jusqu'au" : "Prochain renouvellement le"}{" "}
                  {formatDate(status.subscription.currentPeriodEnd.slice(0, 10))}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button variant="secondary" className="w-full" onClick={handleManage} disabled={loading}>
                  Gérer mon abonnement
                </Button>
                {!status.cancelAtPeriodEnd && (
                  <Button
                    variant="ghost"
                    className="w-full text-[12.5px] text-mv-ink-faint hover:text-mv-red"
                    onClick={() => setCancelReasonOpen(true)}
                    disabled={loading}
                  >
                    Annuler mon abonnement
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-mv-ink-soft">
                Vous n&apos;avez pas encore d&apos;abonnement actif. Choisissez un forfait ci-dessous pour continuer à
                utiliser Minerva Flow après votre période pilote.
              </p>
              <Button
                className="w-full"
                onClick={() => document.getElementById("mv-pricing")?.scrollIntoView({ behavior: "smooth" })}
              >
                Voir les forfaits
              </Button>
            </div>
          )}
        </Card>

        {/* AI Quota & Token Consumption Card */}
        <Card>
          <CardHeader eyebrow="Intelligence Artificielle" title="Consommation Tokens IA" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                  <Cpu size={15} />
                </div>
                <span className="text-[13px] font-bold text-mv-ink">Gemini 3.7 Flash</span>
              </div>
              <Badge tone={percentUsed >= 90 ? "red" : percentUsed >= 70 ? "amber" : "green"}>
                {percentUsed}% utilisé
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-mv-ink">{used.toLocaleString("fr-FR")} tokens</span>
                <span className="text-mv-ink-soft">Quota: {quota.toLocaleString("fr-FR")} tokens/mois</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-mv-cream-soft border border-mv-border">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    percentUsed >= 90 ? "bg-mv-red" : percentUsed >= 70 ? "bg-mv-amber" : "bg-mv-green-dark"
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-mv-border space-y-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                Quotas IA inclus par plan
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {(["starter", "pro", "enterprise"] as const).map((tier) => (
                  <div
                    key={tier}
                    className={`p-2 rounded-xl border ${planTier === tier ? "border-mv-green bg-mv-green-tint/30 font-bold" : "border-mv-border bg-mv-surface"}`}
                  >
                    <p className="text-mv-ink">{PLAN_NAMES[tier]}</p>
                    <p className="text-mv-ink-soft text-[11px]">
                      {(PLAN_AI_QUOTAS[tier] / 1000).toLocaleString("fr-FR")}k / mois
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {status?.subscription && (
              <div className="pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs font-semibold gap-1.5"
                  onClick={() => document.getElementById("mv-pricing")?.scrollIntoView({ behavior: "smooth" })}
                  disabled={loading}
                >
                  <Zap size={13} className="text-mv-amber" />
                  <span>Changer de forfait</span>
                  <ArrowUpRight size={13} />
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {status?.configured && (
        <div id="mv-pricing">
          <PricingTableFive
            plans={billingSdkPlans}
            theme="classic"
            title={status.subscription ? "Changer de forfait" : "Choisissez votre forfait"}
            description="Passez d'un forfait à l'autre à tout moment — le changement est proratisé automatiquement."
            onPlanSelect={handleSelectPlan}
          />
        </div>
      )}

      {status?.subscription && invoices && invoices.length > 0 && (
        <div className="mx-auto max-w-4xl w-full">
          <InvoiceHistory invoices={invoices} />
        </div>
      )}

      {/* Plan switch — proration preview before confirming */}
      <Modal
        open={Boolean(switchTarget)}
        onClose={() => setSwitchTarget(null)}
        title="Confirmer le changement de forfait"
        width={720}
      >
        {switchTarget && status?.subscription && (
          <ProrationPreview
            currentPlan={{
              plan: {
                id: currentPlanDef.tier,
                title: currentPlanDef.name,
                description: currentPlanDef.description,
                monthlyPrice: String(currentPlanDef.monthlyPriceCad ?? 0),
                yearlyPrice: String(currentPlanDef.yearlyPriceCad ?? 0),
                currency: "$",
                buttonText: "",
                features: [],
              },
              type: (status.subscription.billingInterval ?? "monthly") as "monthly" | "yearly",
              nextBillingDate: status.subscription.currentPeriodEnd ?? "",
              paymentMethod: "",
              status: "active",
            }}
            newPlan={{
              id: switchTarget.tier,
              title: PLANS[switchTarget.tier].name,
              description: PLANS[switchTarget.tier].description,
              monthlyPrice: String(PLANS[switchTarget.tier].monthlyPriceCad ?? 0),
              yearlyPrice: String(PLANS[switchTarget.tier].yearlyPriceCad ?? 0),
              currency: "$",
              buttonText: "",
              features: [],
            }}
            billingCycle={switchTarget.interval}
            effectiveDate="immediately"
            theme="minimal"
            confirmText={loading ? "Confirmation…" : "Confirmer le changement"}
            cancelText="Annuler"
            onConfirm={handleConfirmSwitch}
            onCancel={() => setSwitchTarget(null)}
          />
        )}
      </Modal>

      {/* Step 1: exit reason (kept simple/native — the SDK dialog below owns the retention warning + final confirm) */}
      <Modal
        open={cancelReasonOpen}
        onClose={() => setCancelReasonOpen(false)}
        title="Avant de partir…"
        description="Dites-nous pourquoi — ça nous aide à améliorer Minerva Flow."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {REASON_OPTIONS.map((opt) => (
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
            placeholder="Un détail à ajouter ? (optionnel)"
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
          title="On est tristes de vous voir partir…"
          description={`Avant de confirmer, voici ce que vous garderiez avec ${PLANS[planTier].name}.`}
          width={720}
        >
          <CancelSubscriptionCard
            title=""
            description=""
            plan={billingSdkPlans.find((p) => p.id === planTier) ?? billingSdkPlans[0]}
            warningTitle="Vous perdrez l'accès à votre workspace"
            warningText="À la fin de votre période déjà payée, l'accès à Minerva Flow sera coupé pour tous les membres de l'équipe."
            keepButtonText={`Garder mon plan ${PLANS[planTier].name}`}
            continueButtonText="Continuer l'annulation"
            finalTitle="Dernière étape — confirmer l'annulation"
            finalSubtitle="Votre accès reste actif jusqu'à la fin de la période déjà payée."
            finalWarningText="Aucun remboursement au prorata n'est effectué pour la période en cours."
            goBackButtonText="Attendez, revenir en arrière"
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

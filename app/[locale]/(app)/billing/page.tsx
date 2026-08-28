"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createCheckoutSessionAction, createBillingPortalSessionAction, getBillingStatusAction } from "./actions";
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

export default function BillingPage() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getBillingStatusAction>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBillingStatusAction().then(setStatus);
  }, []);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const url = await createCheckoutSessionAction();
      if (url) window.location.href = url;
      else toast.error("La facturation n'est pas encore configurée.");
    } finally {
      setLoading(false);
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

  const aiUsage = status?.aiUsage;
  const planTier = (aiUsage?.planTier ?? "starter") as PlanTier;
  const quota = aiUsage?.monthlyQuota ?? PLAN_AI_QUOTAS.starter;
  const used = aiUsage?.tokensUsed ?? 0;
  const percentUsed = Math.min(100, Math.round((used / Math.max(1, quota)) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Facturation & Quotas IA"
        description="Votre abonnement Flow par Minerva — gestion du forfait mensuel et consommation du moteur IA Gemini 3.7 Flash."
      />

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
                    La facturation n&apos;est pas encore activée pour votre workspace — profitez de Flow par Minerva
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
              {status.subscription.currentPeriodEnd && (
                <p className="text-[12.5px] text-mv-ink-faint">
                  Prochain renouvellement le {formatDate(status.subscription.currentPeriodEnd.slice(0, 10))}
                </p>
              )}
              <Button variant="secondary" className="w-full" onClick={handleManage} disabled={loading}>
                Gérer mon abonnement
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-mv-ink-soft">
                Vous n&apos;avez pas encore d&apos;abonnement actif. Souscrivez pour continuer à utiliser Flow par Minerva
                après votre période pilote.
              </p>
              <Button className="w-full" onClick={handleSubscribe} disabled={loading}>
                {loading ? "Redirection…" : "S'abonner"}
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

            {/* Gauge progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-mv-ink">{used.toLocaleString("fr-FR")} tokens</span>
                <span className="text-mv-ink-soft">Quota: {quota.toLocaleString("fr-FR")} tokens/mois</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-mv-cream-soft border border-mv-border">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    percentUsed >= 90
                      ? "bg-mv-red"
                      : percentUsed >= 70
                      ? "bg-mv-amber"
                      : "bg-mv-green-dark"
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>

            {/* Plans comparison */}
            <div className="pt-2 border-t border-mv-border space-y-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                Quotas IA inclus par plan
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className={`p-2 rounded-xl border ${planTier === "starter" ? "border-mv-green bg-mv-green-tint/30 font-bold" : "border-mv-border bg-mv-surface"}`}>
                  <p className="text-mv-ink">Starter</p>
                  <p className="text-mv-ink-soft text-[11px]">100k / mois</p>
                </div>
                <div className={`p-2 rounded-xl border ${planTier === "pro" ? "border-mv-green bg-mv-green-tint/30 font-bold" : "border-mv-border bg-mv-surface"}`}>
                  <p className="text-mv-ink">Pro</p>
                  <p className="text-mv-ink-soft text-[11px]">500k / mois</p>
                </div>
                <div className={`p-2 rounded-xl border ${planTier === "enterprise" ? "border-mv-green bg-mv-green-tint/30 font-bold" : "border-mv-border bg-mv-surface"}`}>
                  <p className="text-mv-ink">Entreprise</p>
                  <p className="text-mv-ink-soft text-[11px]">2M / mois</p>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs font-semibold gap-1.5"
                onClick={handleManage}
                disabled={loading || !status?.configured}
              >
                <Zap size={13} className="text-mv-amber" />
                <span>Recharger ou modifier mon forfait</span>
                <ArrowUpRight size={13} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

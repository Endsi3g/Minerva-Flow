"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/app-context";
import {
  getStripeConnectStatusAction,
  startStripeConnectOnboardingAction,
  refreshStripeConnectStatusAction,
} from "@/app/[locale]/(app)/settings/stripe-connect-actions";
import { Stripe as StripeIcon } from "@/components/ui/BrandIcons";
import { RefreshCw } from "lucide-react";
import { isRestaurantConnectReady } from "@/lib/stripe/connect-capabilities";
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

type Status = {
  configured: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  apiVersion: "v1" | "v2";
  transfersStatus: "active" | "pending" | "restricted" | "unsupported" | "unrequested";
  recipientPayoutsStatus: "active" | "pending" | "restricted" | "unsupported" | "unrequested";
  requirementsDueCount: number;
};

export function StripeConnectCard() {
  const { role } = useApp();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [statusLoadFailed, setStatusLoadFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    setIsLoadingStatus(true);
    setStatusLoadFailed(false);
    try {
      const nextStatus = await getStripeConnectStatusAction();
      if (!nextStatus) {
        setStatusLoadFailed(true);
        return;
      }
      setStatus(nextStatus);
    } catch {
      setStatusLoadFailed(true);
    } finally {
      setIsLoadingStatus(false);
    }
  }

  useEffect(() => {
    let active = true;
    getStripeConnectStatusAction()
      .then((nextStatus) => {
        if (!active) return;
        if (nextStatus) setStatus(nextStatus);
        else setStatusLoadFailed(true);
      })
      .catch(() => {
        if (active) setStatusLoadFailed(true);
      })
      .finally(() => {
        if (active) setIsLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Returning from Stripe's hosted onboarding: an expired refresh_url must
  // immediately relaunch onboarding rather than show a dead-end page; a
  // normal return_url just re-pulls the account state.
  useEffect(() => {
    const stripeConnect = searchParams.get("stripe_connect");
    if (stripeConnect === "refresh") {
      startTransition(async () => {
        const url = await startStripeConnectOnboardingAction();
        if (url) window.location.href = url;
      });
    } else if (stripeConnect === "return") {
      startTransition(async () => {
        await refreshStripeConnectStatusAction();
        refresh();
      });
    }
  }, [searchParams]);

  if (role !== "owner") return null;

  function statusLine() {
    if (!status) return "";
    if (!status.configured) return "Non configuré — bientôt disponible";
    if (!status.accountId) return "Non connecté";
    if (isReady) return "Connecté — paiements actifs";
    if (status.apiVersion === "v2" && status.requirementsDueCount > 0) return `${status.requirementsDueCount} information${status.requirementsDueCount > 1 ? "s" : ""} requise${status.requirementsDueCount > 1 ? "s" : ""} par Stripe`;
    if (status.apiVersion === "v2" && (status.transfersStatus === "restricted" || status.recipientPayoutsStatus === "restricted")) return "Compte restreint — vérifiez les informations demandées par Stripe";
    if (status.apiVersion === "v2") return "Activation ou vérification en cours chez Stripe";
    if (status.detailsSubmitted) return "Configuration en cours de vérification par Stripe";
    return "Configuration Stripe incomplète — reprenez l'inscription";
  }

  const isReady = status ? isRestaurantConnectReady({
    apiVersion: status.apiVersion,
    legacyChargesEnabled: status.chargesEnabled,
    transfersStatus: status.transfersStatus,
    payoutsStatus: status.recipientPayoutsStatus,
  }) : false;

  return (
    <Card>
      <CardHeader
        eyebrow="Paiements"
        title="Paiements en ligne des clients"
        description="Connectez le compte Stripe de votre restaurant pour recevoir les transferts associés aux commandes web — séparément de votre abonnement Minerva Flow (voir Facturation)."
      />
      {status && !status.configured && (
        <div className="mb-3 rounded-lg border border-mv-border-soft bg-mv-cream-soft px-3.5 py-3" role="status">
          <p className="text-[13px] leading-relaxed text-mv-ink-soft">
            Stripe Connect n’est pas configuré sur cet environnement. Les paiements en ligne seront bientôt disponibles.
          </p>
        </div>
      )}
      {isLoadingStatus && !status ? (
        <div className="space-y-2 rounded-lg border border-mv-border-soft px-3.5 py-3" role="status" aria-label="Chargement du statut Stripe Connect">
          <div className="h-4 w-40 animate-pulse rounded bg-mv-ink/10" />
          <div className="h-3 w-64 max-w-full animate-pulse rounded bg-mv-ink/10" />
        </div>
      ) : statusLoadFailed && !status ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-mv-border-soft px-3.5 py-3" role="alert">
          <p className="text-sm text-mv-ink-soft">Le statut Stripe Connect n’a pas pu être chargé.</p>
          <Button size="sm" variant="outline" disabled={isLoadingStatus} onClick={() => void refresh()}>
            {isLoadingStatus ? "Réessai…" : "Réessayer"}
          </Button>
        </div>
      ) : !status ? (
        <div className="rounded-lg border border-mv-border-soft px-3.5 py-3" role="status">
          <p className="text-sm text-mv-ink-soft">Le statut Stripe Connect est indisponible.</p>
        </div>
      ) : <div className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3.5 py-3">
        <div className="flex items-center gap-3">
          <StripeIcon width={22} height={22} className="shrink-0" />
          <div>
            <p className="text-[13.5px] font-semibold text-mv-ink">Stripe Connect</p>
            <p className="text-[12px] text-mv-ink-faint">{statusLine()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isReady && (
            <>
              <Badge tone="green" dot>
                Connecté
              </Badge>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await refreshStripeConnectStatusAction();
                    refresh();
                  })
                }
                className="flex items-center gap-1.5 rounded-lg border border-mv-border px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:opacity-50"
              >
                <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
                Rafraîchir
              </button>
            </>
          )}
          {!isReady && (
            <Button
              size="sm"
              disabled={!status.configured || isPending}
              onClick={() =>
                startTransition(async () => {
                  const url = await startStripeConnectOnboardingAction();
                  if (url) window.location.href = url;
                })
              }
            >
              {!status.configured ? "Bientôt disponible" : status.accountId ? "Continuer l'inscription" : "Connecter Stripe"}
            </Button>
          )}
        </div>
      </div>}
    </Card>
  );
}

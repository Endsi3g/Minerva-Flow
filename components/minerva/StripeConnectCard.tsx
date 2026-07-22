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
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

type Status = {
  configured: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export function StripeConnectCard() {
  const { role } = useApp();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    getStripeConnectStatusAction().then(setStatus);
  }

  useEffect(refresh, []);

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

  if (role !== "owner" || !status) return null;

  function statusLine() {
    if (!status) return "";
    if (!status.configured) return "Pas encore disponible";
    if (!status.accountId) return "Non connecté";
    if (status.chargesEnabled) return "Connecté — paiements actifs";
    if (status.detailsSubmitted) return "Configuration en cours de vérification par Stripe";
    return "Configuration Stripe incomplète — reprenez l'inscription";
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Paiements"
        title="Paiements en ligne des clients"
        description="Recevez les paiements de vos clients directement dans votre propre compte Stripe — distinct de votre abonnement Flow par Minerva (voir Facturation)."
      />
      <div className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3.5 py-3">
        <div className="flex items-center gap-3">
          <StripeIcon width={22} height={22} className="shrink-0" />
          <div>
            <p className="text-[13.5px] font-semibold text-mv-ink">Stripe Connect</p>
            <p className="text-[12px] text-mv-ink-faint">{statusLine()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status.chargesEnabled && (
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
          {!status.chargesEnabled && (
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
              {status.accountId ? "Continuer l'inscription" : "Connecter Stripe"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

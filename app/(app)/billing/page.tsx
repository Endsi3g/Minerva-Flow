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

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Facturation"
        description="Votre abonnement Minerva Flow — un tarif mensuel fixe par workspace, qui couvre tous vos établissements."
      />

      <div className="mx-auto max-w-xl w-full">
        <Card>
          <CardHeader eyebrow="Abonnement" title="Plan Minerva Flow" />

          {!status ? (
            <p className="text-[13px] text-mv-ink-faint">Chargement…</p>
          ) : !status.configured ? (
            <p className="text-[13px] text-mv-ink-soft">
              La facturation n&apos;est pas encore activée pour votre workspace — vous utilisez Minerva Flow
              gratuitement pour l&apos;instant.
            </p>
          ) : status.subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stripe width={16} height={16} />
                  <span className="text-[13.5px] font-medium text-mv-ink">Abonnement mensuel</span>
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
                Vous n&apos;avez pas encore d&apos;abonnement actif. Souscrivez pour continuer à utiliser Minerva Flow
                après votre période pilote.
              </p>
              <Button className="w-full" onClick={handleSubscribe} disabled={loading}>
                {loading ? "Redirection…" : "S'abonner"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

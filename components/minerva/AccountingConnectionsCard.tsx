"use client";

import { FullPageLink } from "@/components/ui/FullPageLink";


import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/app-context";
import { getPosStatusAction, type PosProviderConfigured } from "@/app/[locale]/(app)/settings/pos-actions";
import type { PosConnection } from "@/lib/data/pos-connections";
import {
  QuickBooks,
  Xero,
  Sage,
  FreshBooks,
  Dext,
  Pennylane,
} from "@/components/ui/BrandIcons";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";

type AccountingService = {
  id: string;
  name: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; width?: number; height?: number; className?: string }>;
  isLive: boolean;
};

function buildACCOUNTING_SERVICES(t: (key: string) => string): AccountingService[] {
  return [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    description: t("directExportOfDaily"),
    Icon: QuickBooks,
    isLive: true,
  },
  {
    id: "xero",
    name: "Xero",
    description: t("bankSyncAndAutomated"),
    Icon: Xero,
    isLive: false,
  },
  {
    id: "sage",
    name: "Sage Business Cloud",
    description: t("generalLedgerAndReconciliation"),
    Icon: Sage,
    isLive: false,
  },
  {
    id: "freshbooks",
    name: "FreshBooks",
    description: t("invoicingTipManagementAnd"),
    Icon: FreshBooks,
    isLive: false,
  },
  {
    id: "dext",
    name: "Dext (Receipt Bank)",
    description: t("automaticAiExtractionOf"),
    Icon: Dext,
    isLive: false,
  },
  {
    id: "pennylane",
    name: "Pennylane",
    description: t("realTimeFinancialManagement"),
    Icon: Pennylane,
    isLive: false,
  },
];
}

export function AccountingConnectionsCard() {
  const t = useTranslations("accountingConnections");
  const { restaurantId } = useApp();
  const [status, setStatus] = useState<{ configured: PosProviderConfigured; connections: PosConnection[] } | null>(
    null
  );
  const [requestedServices, setRequestedServices] = useState<Record<string, boolean>>({});

  function refresh() {
    if (!restaurantId) return;
    getPosStatusAction(restaurantId).then(setStatus);
  }

  useEffect(refresh, [restaurantId]);

  const qbConnection = status?.connections.find((c) => c.provider === "quickbooks");
  const qbConfigured = status?.configured.quickbooks ?? false;

  function handleRequestAccess(service: AccountingService) {
    setRequestedServices((prev) => ({ ...prev, [service.id]: true }));
    toast.success(t("requestSavedForServicename", { serviceName: service.name }), {
      description: t("ourTeamWillNotify"),
    });
  }

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader
          eyebrow={t("accountingBilling")}
          title="Logiciels Comptables"
          description={t("syncYourRegisterClosings")}
        />

        <div className="space-y-2.5">
          {buildACCOUNTING_SERVICES(t).map((service) => {
            const Icon = service.Icon;
            const isRequested = Boolean(requestedServices[service.id]);

            if (service.isLive) {
              const isConnected = Boolean(qbConnection && qbConnection.status === "connecte");
              const hasError = qbConnection?.status === "erreur";

              return (
                <div
                  key={service.id}
                  className="flex flex-col gap-3 rounded-xl border border-mv-border-soft bg-mv-surface p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-mv-border-soft bg-mv-cream-soft">
                      <Icon width={22} height={22} className="shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13.5px] font-semibold text-mv-ink">{service.name}</p>
                        {isConnected ? (
                          <Badge tone="green" dot>
                            Connecté
                          </Badge>
                        ) : qbConfigured ? (
                          <Badge tone="neutral">{t("ready")}</Badge>
                        ) : (
                          <Badge tone="neutral">{t("comingSoon")}</Badge>
                        )}
                      </div>
                      <p className="text-[12px] text-mv-ink-faint">{service.description}</p>
                    </div>
                  </div>

                  <div className="self-end sm:self-auto">
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-mv-green-tint px-2.5 py-1 text-[12px] font-bold text-mv-green-dark">
                        <Check size={12} /> Actif
                      </span>
                    ) : hasError ? (
                      <FullPageLink
                        href="/api/oauth/quickbooks"
                        className="rounded-lg bg-mv-red px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-mv-red/90"
                      >
                        Reconnecter
                      </FullPageLink>
                    ) : (
                      <FullPageLink
                        href={qbConfigured ? "/api/oauth/quickbooks" : undefined}
                        aria-disabled={!qbConfigured}
                        className={
                          qbConfigured
                            ? "rounded-lg bg-mv-green px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-mv-green-dark"
                            : "cursor-not-allowed rounded-lg bg-mv-ink/[0.06] px-3 py-1.5 text-[12px] font-semibold text-mv-ink-faint"
                        }
                      >
                        Connecter
                      </FullPageLink>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={service.id}
                className="flex flex-col gap-3 rounded-xl border border-mv-border-soft bg-mv-cream-soft/40 p-3 transition-colors hover:bg-mv-surface sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-mv-border-soft bg-mv-surface">
                    <Icon width={22} height={22} className="shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-mv-ink">{service.name}</p>
                      <span className="rounded-md bg-mv-cream px-1.5 py-0.5 text-[12px] font-medium text-mv-ink-faint border border-mv-border-soft">
                        Bientôt
                      </span>
                    </div>
                    <p className="text-[12px] text-mv-ink-faint">{service.description}</p>
                  </div>
                </div>

                <div>
                  {isRequested ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-mv-green-tint px-2.5 py-1 text-[12px] font-semibold text-mv-green-dark">
                      <Check size={12} /> Demandé
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestAccess(service)}
                      className="text-[12px] h-7.5 px-2.5"
                    >
                      <Sparkles size={12} className="text-mv-green-dark" /> Demander l&apos;accès
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

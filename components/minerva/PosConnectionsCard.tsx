"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/app-context";
import { getPosStatusAction } from "@/app/(app)/settings/pos-actions";
import type { PosConnection, PosProvider } from "@/lib/data/pos-connections";
import { useEffect, useState } from "react";

const providerLabel: Record<PosProvider, string> = {
  square: "Square",
  lightspeed: "Lightspeed",
  clover: "Clover",
};

function ConnectRow({
  provider,
  configured,
  connection,
}: {
  provider: PosProvider;
  configured: boolean;
  connection?: PosConnection;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3.5 py-3">
      <div>
        <p className="text-[13.5px] font-semibold text-mv-ink">{providerLabel[provider]}</p>
        <p className="text-[12px] text-mv-ink-faint">
          {!configured
            ? "Pas encore disponible"
            : connection
              ? `Connecté${connection.externalAccountId ? ` — ${connection.externalAccountId}` : ""}`
              : "Non connecté"}
        </p>
      </div>
      {connection ? (
        <Badge tone="green" dot>
          Connecté
        </Badge>
      ) : (
        <a
          href={configured ? `/api/oauth/${provider}` : undefined}
          aria-disabled={!configured}
          className={
            configured
              ? "rounded-lg bg-mv-ink px-3 py-1.5 text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-ink/90"
              : "cursor-not-allowed rounded-lg bg-mv-ink/[0.06] px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-faint"
          }
        >
          Connecter
        </a>
      )}
    </div>
  );
}

export function PosConnectionsCard() {
  const { restaurantId } = useApp();
  const [status, setStatus] = useState<{ squareConfigured: boolean; connections: PosConnection[] } | null>(
    null
  );

  useEffect(() => {
    if (!restaurantId) return;
    getPosStatusAction(restaurantId).then(setStatus);
  }, [restaurantId]);

  if (!status) return null;

  const squareConnection = status.connections.find((c) => c.provider === "square");

  return (
    <Card>
      <CardHeader
        eyebrow="Point de vente"
        title="Système de caisse (POS)"
        description="Synchronisez vos ventes automatiquement plutôt que de les saisir à la main."
      />
      <div className="space-y-2">
        <ConnectRow provider="square" configured={status.squareConfigured} connection={squareConnection} />
        <ConnectRow provider="lightspeed" configured={false} />
        <ConnectRow provider="clover" configured={false} />
      </div>
    </Card>
  );
}

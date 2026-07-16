"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/app-context";
import { getPosStatusAction, syncPosNowAction } from "@/app/(app)/settings/pos-actions";
import type { PosConnection, PosProvider } from "@/lib/data/pos-connections";
import { formatDate } from "@/lib/utils";
import { RefreshCw, Store } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Square } from "@/components/ui/BrandIcons";

const providerLabel: Record<PosProvider, string> = {
  square: "Square",
  lightspeed: "Lightspeed",
  clover: "Clover",
};

// Square has an official brand icon in @thesvg/react; Lightspeed/Clover
// don't (niche POS brands), so they fall back to a generic store icon.
function ProviderIcon({ provider }: { provider: PosProvider }) {
  if (provider === "square") return <Square width={22} height={22} className="shrink-0" />;
  return <Store size={20} className="shrink-0 text-mv-ink-faint" />;
}

function ConnectRow({
  provider,
  configured,
  connection,
  onSynced,
}: {
  provider: PosProvider;
  configured: boolean;
  connection?: PosConnection;
  onSynced: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const hasError = connection?.status === "erreur";

  function statusLine() {
    if (!configured) return "Pas encore disponible";
    if (!connection) return "Non connecté";
    if (hasError) return "La connexion a été interrompue — reconnectez pour reprendre la synchronisation.";
    if (connection.lastSyncedAt) return `Dernière synchronisation — ${formatDate(connection.lastSyncedAt)}`;
    return "Connecté — première synchronisation en cours.";
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3.5 py-3">
      <div className="flex items-center gap-3">
        <ProviderIcon provider={provider} />
        <div>
          <p className="text-[13.5px] font-semibold text-mv-ink">{providerLabel[provider]}</p>
          <p className="text-[12px] text-mv-ink-faint">{statusLine()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connection && !hasError && (
          <>
            <Badge tone="green" dot>
              Connecté
            </Badge>
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                await syncPosNowAction();
                onSynced();
              })}
              className="flex items-center gap-1.5 rounded-lg border border-mv-border px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:opacity-50"
            >
              <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
              {isPending ? "Synchronisation…" : "Synchroniser"}
            </button>
          </>
        )}
        {connection && hasError && (
          <a
            href={`/api/oauth/${provider}`}
            className="rounded-lg bg-mv-red px-3 py-1.5 text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-red/90"
          >
            Reconnecter
          </a>
        )}
        {!connection && (
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
    </div>
  );
}

export function PosConnectionsCard() {
  const { restaurantId } = useApp();
  const [status, setStatus] = useState<{ squareConfigured: boolean; connections: PosConnection[] } | null>(
    null
  );

  function refresh() {
    if (!restaurantId) return;
    getPosStatusAction(restaurantId).then(setStatus);
  }

  useEffect(refresh, [restaurantId]);

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
        <ConnectRow
          provider="square"
          configured={status.squareConfigured}
          connection={squareConnection}
          onSynced={refresh}
        />
        <ConnectRow provider="lightspeed" configured={false} onSynced={refresh} />
        <ConnectRow provider="clover" configured={false} onSynced={refresh} />
      </div>
    </Card>
  );
}

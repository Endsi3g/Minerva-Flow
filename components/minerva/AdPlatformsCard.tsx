"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/app-context";
import { getAdPlatformStatusAction } from "@/app/(app)/settings/ad-platforms-actions";
import type { AdPlatformConnection, AdProvider } from "@/lib/types";
import { useEffect, useState, type ComponentType } from "react";
import { Meta, GoogleAds } from "@thesvg/react";

type BrandIcon = ComponentType<{ width?: number; height?: number; className?: string }>;

const providerLabel: Record<AdProvider, string> = { meta: "Meta Ads", google: "Google Ads" };
const providerIcon: Record<AdProvider, BrandIcon> = { meta: Meta, google: GoogleAds };

function ConnectRow({
  provider,
  configured,
  connection,
}: {
  provider: AdProvider;
  configured: boolean;
  connection?: AdPlatformConnection;
}) {
  const Icon = providerIcon[provider];
  return (
    <div className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3.5 py-3">
      <div className="flex items-center gap-3">
        <Icon width={22} height={22} className="shrink-0" />
        <div>
          <p className="text-[13.5px] font-semibold text-mv-ink">{providerLabel[provider]}</p>
          <p className="text-[12px] text-mv-ink-faint">
            {!configured
              ? "Clés API non configurées"
              : connection
                ? `Connecté${connection.externalAccountId ? ` — ${connection.externalAccountId}` : ""}`
                : "Non connecté"}
          </p>
        </div>
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

export function AdPlatformsCard() {
  const { restaurantId } = useApp();
  const [status, setStatus] = useState<{
    metaConfigured: boolean;
    googleConfigured: boolean;
    connections: AdPlatformConnection[];
  } | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    getAdPlatformStatusAction(restaurantId).then(setStatus);
  }, [restaurantId]);

  if (!status) return null;

  const metaConnection = status.connections.find((c) => c.provider === "meta");
  const googleConnection = status.connections.find((c) => c.provider === "google");

  return (
    <Card>
      <CardHeader
        eyebrow="Attribution publicitaire"
        title="Publicité"
        description="Connectez vos comptes pour voir d'où viennent vos clients sur la carte."
      />
      <div className="space-y-2.5">
        <ConnectRow provider="meta" configured={status.metaConfigured} connection={metaConnection} />
        <ConnectRow provider="google" configured={status.googleConfigured} connection={googleConnection} />
      </div>
    </Card>
  );
}

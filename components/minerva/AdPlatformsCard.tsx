"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/app-context";
import { getAdPlatformStatusAction } from "@/app/[locale]/(app)/settings/ad-platforms-actions";
import type { AdPlatformConnection, AdProvider } from "@/lib/types";
import { useEffect, useState, type ComponentType } from "react";
import { Meta, GoogleAds, Instagram } from "@/components/ui/BrandIcons";

type BrandIcon = ComponentType<{ width?: number; height?: number; className?: string }>;

const providerLabel: Record<AdProvider, string> = { meta: "Meta Ads", google: "Google Ads", instagram: "Instagram" };
const providerIcon: Record<AdProvider, BrandIcon> = { meta: Meta, google: GoogleAds, instagram: Instagram };

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

type AdPlatformStatus = {
  metaConfigured: boolean;
  googleConfigured: boolean;
  instagramConfigured: boolean;
  connections: AdPlatformConnection[];
};

function useAdPlatformStatus(restaurantId: string | null | undefined) {
  const [status, setStatus] = useState<AdPlatformStatus | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    getAdPlatformStatusAction(restaurantId).then(setStatus);
  }, [restaurantId]);

  return status;
}

export function AdPlatformsCard() {
  const { restaurantId } = useApp();
  const status = useAdPlatformStatus(restaurantId);

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

/**
 * Deliberately separate from AdPlatformsCard: connecting Instagram grants
 * content-publishing permission (instagram_content_publish), not ad-account
 * access — a distinct consent an owner might grant without ever touching
 * Meta Ads, so it gets its own card and its own OAuth round-trip rather
 * than being folded into "Publicité".
 */
export function InstagramCard() {
  const { restaurantId } = useApp();
  const status = useAdPlatformStatus(restaurantId);

  if (!status) return null;

  const instagramConnection = status.connections.find((c) => c.provider === "instagram");

  return (
    <Card>
      <CardHeader
        eyebrow="Réseaux sociaux"
        title="Instagram"
        description="Publiez vos visuels Marketing Studio, modérez les commentaires et activez les réponses IA sur votre compte Instagram professionnel."
      />
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-mv-border-soft p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Instagram width={24} height={24} className="shrink-0" />
            <div>
              <p className="text-[13.5px] font-semibold text-mv-ink">Instagram Business</p>
              <p className="text-[12px] text-mv-ink-faint">
                {!status.instagramConfigured
                  ? "Clés API non configurées"
                  : instagramConnection
                    ? `Connecté${instagramConnection.externalAccountId ? ` (ID: ${instagramConnection.externalAccountId})` : ""}`
                    : "Direct via Instagram Login (aucun compte Facebook requis)"}
              </p>
            </div>
          </div>

          {instagramConnection ? (
            <Badge tone="green" dot>
              Connecté
            </Badge>
          ) : (
            <a
              href={status.instagramConfigured ? "/api/oauth/instagram?mode=direct" : undefined}
              aria-disabled={!status.instagramConfigured}
              className={
                status.instagramConfigured
                  ? "inline-flex items-center justify-center gap-1.5 rounded-lg bg-mv-green px-3.5 py-1.5 text-[12.5px] font-semibold text-mv-cream-soft transition-all hover:bg-mv-green-dark shadow-mv-sm"
                  : "cursor-not-allowed rounded-lg bg-mv-ink/[0.06] px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-faint"
              }
            >
              Connecter avec Instagram
            </a>
          )}
        </div>

        {!instagramConnection && status.instagramConfigured && (
          <div className="pt-1 text-center sm:text-right">
            <a
              href="/api/oauth/instagram?mode=facebook"
              className="text-[11.5px] text-mv-ink-faint transition-colors hover:text-mv-green-dark hover:underline"
            >
              Vous gérez aussi des publicités Meta Ads ? Connecter via Facebook →
            </a>
          </div>
        )}

        {instagramConnection && !instagramConnection.externalAccountId && (
          <p className="text-[12px] text-mv-ink-faint">
            Connecté en mode Facebook, mais aucun compte Instagram professionnel n&apos;est lié à votre Page — liez-en un
            depuis Meta Business Suite, ou reconnectez via le bouton direct Instagram.
          </p>
        )}
      </div>
    </Card>
  );
}

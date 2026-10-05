"use client";


import { useTranslations, useLocale } from "next-intl";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/app-context";
import {
  getPosStatusAction,
  syncPosNowAction,
  importCloverCatalogAction,
  connectToastWithGuidAction,
  connectCloverWithTokenAction,
  type PosProviderConfigured,
} from "@/app/[locale]/(app)/settings/pos-actions";
import type { PosConnection, PosProvider } from "@/lib/data/pos-connections";
import { formatDate } from "@/lib/utils";
import { RefreshCw, Store, KeyRound, Download } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Square, QuickBooks, Clover, Toast } from "@/components/ui/BrandIcons";
import { toast as sonnerToast } from "sonner";

const providerLabel: Record<PosProvider, string> = {
  square: "Square",
  lightspeed: "Lightspeed",
  clover: "Clover",
  toast: "Toast POS",
  quickbooks: "QuickBooks",
};

function buildProviderCapabilities(t: (key: string) => string): Partial<Record<PosProvider, string>> {
  return {
  square: t("oauthConnectionDailySales"),
  lightspeed: t("apiConnectionDailySales"),
  clover: t("apiConnectionSalesAnd"),
  toast: t("partnerApiSalesAnd"),
};
}

// Square, QuickBooks, Clover, and Toast have official brand icons in BrandIcons.tsx.
// Lightspeed only ships a full horizontal partner-badge lockup (icon +
// wordmark + "Partenaire"), not an icon-only mark, so it's rendered as its
// own badge in ConnectRow instead of squeezed into this 22x22 icon slot.
function ProviderIcon({ provider }: { provider: PosProvider }) {
  if (provider === "square") return <Square width={22} height={22} className="shrink-0" />;
  if (provider === "quickbooks") return <QuickBooks width={22} height={22} className="shrink-0" />;
  if (provider === "clover") return <Clover width={22} height={22} className="shrink-0" />;
  if (provider === "toast") return <Toast width={22} height={22} className="shrink-0" />;
  return <Store size={20} className="shrink-0 text-mv-ink-faint" />;
}

/* eslint-disable @next/next/no-img-element -- official partner lockup, not a next/image-optimized photo */
function LightspeedBadge() {
  return (
    <img
      src="/pos/lightspeed-partner-fr-red-black.png"
      alt="Lightspeed — Partenaire"
      className="h-6 w-auto shrink-0"
    />
  );
}
/* eslint-enable @next/next/no-img-element */


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
  const locale = useLocale();
  const t = useTranslations("posConnections");
  const [isPending, startTransition] = useTransition();
  const [showManualGuid, setShowManualGuid] = useState(false);
  const [guidInput, setGuidInput] = useState("");
  const [showManualClover, setShowManualClover] = useState(false);
  const [cloverMid, setCloverMid] = useState("");
  const [cloverToken, setCloverToken] = useState("");
  const hasError = connection?.status === "erreur";

  function statusLine() {
    if (provider === "clover" && !configured) {
      return t("waitingForMinervaFlow");
    }
    if (!configured && provider !== "clover") return t("applicationCredentialsToConfigure");
    if (!connection) return t("notConnected");
    if (hasError) return t("theConnectionWasInterrupted");
    if (connection.lastSyncedAt) return t("lastSyncDate", { date: formatDate(connection.lastSyncedAt, locale) });
    return t("connectedFirstSyncIn");
  }

  async function handleManualGuidSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guidInput.trim()) return;
    startTransition(async () => {
      const res = await connectToastWithGuidAction(guidInput.trim());
      if (res.success) {
        sonnerToast.success(t("toastPosConnectedSuccessfully"));
        setShowManualGuid(false);
        setGuidInput("");
        onSynced();
      } else {
        sonnerToast.error(t("toastConnectionFailed"), { description: res.error });
      }
    });
  }

  async function handleManualCloverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cloverMid.trim() || !cloverToken.trim()) return;
    startTransition(async () => {
      const res = await connectCloverWithTokenAction(cloverMid.trim(), cloverToken.trim());
      if (res.success) {
        sonnerToast.success(res.merchantName ? t("cloverConnectedMerchantname", { merchantName: res.merchantName }) : t("cloverConnectedSuccessfully"));
        setShowManualClover(false);
        setCloverMid("");
        setCloverToken("");
        onSynced();
      } else {
        sonnerToast.error(t("cloverConnectionFailed"), { description: res.error });
      }
    });
  }

  return (
    <div className="rounded-lg border border-mv-border-soft px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {provider === "lightspeed" ? (
            <LightspeedBadge />
          ) : (
            <ProviderIcon provider={provider} />
          )}
          <div>
            {provider !== "lightspeed" && (
              <p className="text-[13.5px] font-semibold text-mv-ink">{providerLabel[provider]}</p>
            )}
            <p className="text-[12px] leading-relaxed text-mv-ink-soft">{buildProviderCapabilities(t)[provider]}</p>
            <p className="text-[12px] text-mv-ink-faint">{statusLine()}</p>
          </div>
        </div>
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          {connection && !hasError && (
            <>
              {provider === "clover" && configured && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    const result = await importCloverCatalogAction();
                    if (result.ok) {
                      const messages = [
                        t("draftsCreated", { count: result.createdDrafts }),
                        t("itemsLinked", { count: result.linkedExisting }),
                        t("alreadyLinked", { count: result.alreadyMapped }),
                      ];
                      sonnerToast.success(t("cloverCatalogImported"), { description: messages.join(" · ") });
                    } else {
                      const description = result.reason === "not_authorized"
                        ? t("onlyAnOwnerOr")
                        : result.reason === "not_connected"
                          ? "Reconnectez Clover avant d’importer son catalogue."
                          : result.reason === "empty_catalog"
                            ? t("noItemsReceivedFrom")
                            : t("theCatalogCouldNot");
                      sonnerToast.error(t("catalogImportFailed"), { description });
                    }
                  })}
                  aria-label={t("importCloverAria")}
                  className="flex min-h-10 items-center gap-1.5 rounded-lg border border-mv-border px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:opacity-50"
                  title={t("importsTheCatalogAs")}
                >
                  <Download size={13} className={isPending ? "animate-bounce" : ""} />
                  <span className="hidden sm:inline">{isPending ? t("importing") : t("importTheCatalog")}</span>
                </button>
              )}
              <Badge tone="green" dot>
                {t("connectedBadge")}
              </Badge>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(async () => {
                  await syncPosNowAction(provider);
                  onSynced();
                })}
                className="flex items-center gap-1.5 rounded-lg border border-mv-border px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:opacity-50"
              >
                <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
                {isPending ? t("syncing") : "Synchroniser"}
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
            <div className="flex items-center gap-1.5">
              {provider === "clover" && configured && (
                <button
                  type="button"
                  onClick={() => setShowManualClover(!showManualClover)}
                  className="rounded-lg border border-mv-border px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5"
                  title={t("enterTheCloverMerchant")}
                >
                  <KeyRound size={13} className="inline mr-1" />
                  Saisie manuelle
                </button>
              )}
              {provider === "toast" && configured && (
                <button
                  type="button"
                  onClick={() => setShowManualGuid(!showManualGuid)}
                  className="rounded-lg border border-mv-border px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5"
                  title="Saisir l'identifiant restaurant Toast"
                >
                  <KeyRound size={13} className="inline mr-1" />
                  Identifiant
                </button>
              )}
              {configured ? (
                <a
                  href={`/api/oauth/${provider}`}
                  className="rounded-lg bg-mv-ink px-3 py-1.5 text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-ink/90"
                >
                  Connecter
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-lg bg-mv-ink/[0.06] px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-faint"
                >
                  {t("inPreparation")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {connection && provider === "clover" && (
        <p className="mt-2 text-[12px] leading-relaxed text-mv-ink-faint">
          {t("importedItemsArriveAs")}
        </p>
      )}

      {showManualClover && !connection && (
        <form onSubmit={handleManualCloverSubmit} className="mt-2.5 space-y-2 border-t border-mv-border-soft pt-2.5">
          <p className="text-[12px] text-mv-ink-faint">
            {t("enterYourMerchantId")}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="Identifiant marchand (ex: BTAKVDTYMGZ46)"
              value={cloverMid}
              onChange={(e) => setCloverMid(e.target.value)}
              className="flex-1 rounded-md border border-mv-border bg-white px-2.5 py-1.5 text-[12px] text-mv-ink font-mono focus:border-mv-green focus:outline-none"
            />
            <input
              type="password"
              placeholder={t("cloverConnectionKey")}
              value={cloverToken}
              onChange={(e) => setCloverToken(e.target.value)}
              className="flex-1 rounded-md border border-mv-border bg-white px-2.5 py-1.5 text-[12px] text-mv-ink font-mono focus:border-mv-green focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPending || !cloverMid.trim() || !cloverToken.trim()}
              className="rounded-md bg-mv-green px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-50 shrink-0"
            >
              {isPending ? t("validating") : "Lier Clover"}
            </button>
          </div>
        </form>
      )}

      {showManualGuid && !connection && (
        <form onSubmit={handleManualGuidSubmit} className="mt-2.5 flex items-center gap-2 border-t border-mv-border-soft pt-2.5">
          <input
            type="text"
            placeholder="Identifiant Toast (ex: a1b2c3d4-e5f6-7890-abcd-ef1234567890)"
            value={guidInput}
            onChange={(e) => setGuidInput(e.target.value)}
            className="flex-1 rounded-md border border-mv-border bg-white px-2.5 py-1 text-[12px] text-mv-ink font-mono focus:border-mv-green focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending || !guidInput.trim()}
            className="rounded-md bg-mv-green px-3 py-1 text-[12px] font-medium text-white transition-opacity disabled:opacity-50"
          >
            {isPending ? t("connecting") : "Lier Toast"}
          </button>
        </form>
      )}
    </div>
  );
}

export function PosConnectionsCard() {
  const t = useTranslations("posConnections");
  const { restaurantId } = useApp();
  const [status, setStatus] = useState<{ configured: PosProviderConfigured; connections: PosConnection[] } | null>(
    null
  );

  function refresh() {
    if (!restaurantId) return;
    getPosStatusAction(restaurantId).then(setStatus);
  }

  useEffect(refresh, [restaurantId]);

  if (!status) return null;

  const connectionFor = (provider: PosProvider) => status.connections.find((c) => c.provider === provider);

  return (
    <Card>
      <CardHeader
        eyebrow="Point de vente"
        title={t("registerSystems")}
        description={t("squareLightspeedCloverAnd")}
      />
      <div className="space-y-2">
        <ConnectRow
          provider="square"
          configured={status.configured.square}
          connection={connectionFor("square")}
          onSynced={refresh}
        />
        <ConnectRow
          provider="lightspeed"
          configured={status.configured.lightspeed}
          connection={connectionFor("lightspeed")}
          onSynced={refresh}
        />
        <ConnectRow
          provider="clover"
          configured={status.configured.clover}
          connection={connectionFor("clover")}
          onSynced={refresh}
        />
        <ConnectRow
          provider="toast"
          configured={status.configured.toast}
          connection={connectionFor("toast")}
          onSynced={refresh}
        />
      </div>
    </Card>
  );
}


import { AccountingConnectionsCard } from "./AccountingConnectionsCard";

/**
 * QuickBooks & Accounting software card.
 * Replaced by the comprehensive AccountingConnectionsCard (QuickBooks, Xero, Sage, FreshBooks, Dext, Pennylane).
 */
export function QuickBooksCard() {
  return <AccountingConnectionsCard />;
}

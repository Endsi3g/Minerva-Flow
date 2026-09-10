"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Square, Clover } from "@/components/ui/BrandIcons";
import { Unlink, RefreshCw, Search, Check, AlertTriangle, Store } from "lucide-react";
import {
  browseCatalogForLinkingAction,
  getPosInventoryMappingsAction,
  upsertPosInventoryMappingAction,
  resyncInventoryToPosAction,
} from "@/app/[locale]/(app)/inventaire/actions";
import type { PosInventoryMapping } from "@/lib/pos/inventory-mapping";
import type { CatalogPosProvider } from "@/lib/pos/catalog-sync";
import type { InventoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Local copy of lib/pos/item-mapping.ts's normalizeItemName — that module pulls in server-only imports, so it can't be imported directly from a client component. */
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ProviderBadge({ provider }: { provider: CatalogPosProvider }) {
  const Icon = provider === "square" ? Square : Clover;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-mv-cream-soft px-2 py-0.5 text-[11px] font-medium text-mv-ink">
      <Icon width={13} height={13} />
      {provider === "square" ? "Square" : "Clover"}
    </span>
  );
}

type Row = {
  provider: CatalogPosProvider;
  externalId: string;
  externalVariationId: string | null;
  name: string;
  mapping: PosInventoryMapping | null;
  autoSuggested: boolean;
};

export function PosInventoryMappingCard({
  restaurantId,
  inventoryItems,
  connectedProviders,
}: {
  restaurantId: string;
  inventoryItems: InventoryItem[];
  connectedProviders: CatalogPosProvider[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unlinked" | "linked">("all");
  const [isPending, startTransition] = useTransition();
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [mappingLists, browseLists] = await Promise.all([
        Promise.all(connectedProviders.map((p) => getPosInventoryMappingsAction(restaurantId, p))),
        Promise.all(connectedProviders.map((p) => browseCatalogForLinkingAction(restaurantId, p))),
      ]);

      const nextRows: Row[] = [];
      connectedProviders.forEach((provider, idx) => {
        const mappings = mappingLists[idx];
        const mappingByExternalId = new Map(mappings.map((m) => [m.externalItemId, m]));
        const catalogItems = browseLists[idx];

        for (const catalogItem of catalogItems) {
          const mapping = mappingByExternalId.get(catalogItem.externalId) ?? null;
          const bestGuess = !mapping
            ? inventoryItems.find((i) => normalizeItemName(i.name) === normalizeItemName(catalogItem.name))
            : undefined;
          nextRows.push({
            provider,
            externalId: catalogItem.externalId,
            externalVariationId: catalogItem.externalVariationId,
            name: catalogItem.name,
            mapping,
            autoSuggested: Boolean(bestGuess),
          });
        }
      });

      setRows(nextRows);
      if (nextRows.some((r) => !r.mapping?.inventoryItemId)) setFilterStatus("unlinked");
    } catch (err) {
      console.error("Failed to load POS inventory catalog:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (connectedProviders.length > 0) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, connectedProviders.join(",")]);

  const linkedCount = useMemo(() => rows.filter((r) => r.mapping?.inventoryItemId).length, [rows]);
  const unlinkedCount = rows.length - linkedCount;

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const isLinked = Boolean(r.mapping?.inventoryItemId);
      if (filterStatus === "unlinked" && isLinked) return false;
      if (filterStatus === "linked" && !isLinked) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.mapping?.inventoryItem?.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, search]);

  function handleLink(row: Row, inventoryItemId: string) {
    if (!inventoryItemId) return;
    const key = `${row.provider}:${row.externalId}`;
    setActionInProgressId(key);
    startTransition(async () => {
      const ok = await upsertPosInventoryMappingAction(
        restaurantId,
        row.provider,
        row.externalId,
        row.name,
        inventoryItemId,
        row.externalVariationId
      );
      if (ok) {
        const found = inventoryItems.find((i) => i.id === inventoryItemId);
        setRows((prev) =>
          prev.map((r) =>
            r === row
              ? {
                  ...r,
                  mapping: {
                    id: r.mapping?.id ?? key,
                    restaurantId,
                    provider: row.provider,
                    externalItemId: row.externalId,
                    externalItemName: row.name,
                    inventoryItemId,
                    inventoryItem: found
                      ? { id: found.id, name: found.name, unit: found.unit, quantityOnHand: found.quantityOnHand }
                      : null,
                  },
                }
              : r
          )
        );
        toast.success(`« ${row.name} » associé à « ${found?.name ?? "un article"} »`);
      } else {
        toast.error("Échec de l'association");
      }
      setActionInProgressId(null);
    });
  }

  function handleUnlink(row: Row) {
    const key = `${row.provider}:${row.externalId}`;
    setActionInProgressId(key);
    startTransition(async () => {
      const ok = await upsertPosInventoryMappingAction(restaurantId, row.provider, row.externalId, row.name, null, row.externalVariationId);
      if (ok) {
        setRows((prev) => prev.map((r) => (r === row ? { ...r, mapping: r.mapping ? { ...r.mapping, inventoryItemId: null, inventoryItem: null } : null } : r)));
        toast.info(`« ${row.name} » dissocié`);
      } else {
        toast.error("Échec de la dissociation");
      }
      setActionInProgressId(null);
    });
  }

  async function handleResync() {
    setResyncing(true);
    const result = await resyncInventoryToPosAction(restaurantId);
    setResyncing(false);
    if (result.providers === 0) {
      toast.info("Aucun compte Clover/Square connecté.");
    } else {
      toast.success(`Synchronisé : ${result.pushed} envoyé(s), ${result.pulled} reçu(s) depuis le POS.`);
      load();
    }
  }

  if (connectedProviders.length === 0) return null;
  if (!loading && rows.length === 0) return null;

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader
        eyebrow="Synchronisation POS & Caisse"
        title="Correspondance des stocks POS"
        description="Associez chaque article du catalogue Clover/Square à un article d'inventaire pour synchroniser les quantités en stock dans les deux sens."
        action={
          <div className="flex items-center gap-2">
            {unlinkedCount > 0 ? (
              <Badge tone="amber" className="flex items-center gap-1">
                <AlertTriangle size={12} />
                {unlinkedCount} non associé{unlinkedCount > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge tone="green" className="flex items-center gap-1">
                <Check size={12} />
                {linkedCount} associé{linkedCount > 1 ? "s" : ""}
              </Badge>
            )}
            <Button size="sm" variant="secondary" onClick={handleResync} disabled={resyncing} className="text-[11.5px]">
              <RefreshCw size={13} className={cn(resyncing && "animate-spin")} />
              Resynchroniser tout
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-mv-border-soft pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterStatus("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors",
              filterStatus === "all" ? "bg-mv-green text-mv-cream-soft" : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-border-soft"
            )}
          >
            Tous ({rows.length})
          </button>
          <button
            onClick={() => setFilterStatus("unlinked")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors",
              filterStatus === "unlinked" ? "bg-mv-amber text-mv-cream-soft" : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-border-soft"
            )}
          >
            Non associés ({unlinkedCount})
          </button>
          <button
            onClick={() => setFilterStatus("linked")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors",
              filterStatus === "linked" ? "bg-mv-green-dark text-mv-cream-soft" : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-border-soft"
            )}
          >
            Associés ({linkedCount})
          </button>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-mv-ink-faint" />
          <input
            type="text"
            placeholder="Rechercher un article…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48 rounded-lg border border-mv-border bg-mv-surface pl-8 pr-3 text-[12px] text-mv-ink placeholder:text-mv-ink-faint focus:border-mv-green focus:outline-none"
          />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-mv-ink-faint">Aucun article ne correspond à ces critères.</div>
      ) : (
        <div className="divide-y divide-mv-border-soft">
          {filteredRows.map((row) => {
            const key = `${row.provider}:${row.externalId}`;
            const isProcessing = actionInProgressId === key;
            return (
              <div key={key} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ProviderBadge provider={row.provider} />
                    <span className="truncate text-[13.5px] font-semibold text-mv-ink">{row.name}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-mono text-mv-ink-faint">ID: {row.externalId}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {row.mapping?.inventoryItemId && row.mapping.inventoryItem ? (
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-mv-cream-soft px-3 py-1 text-right">
                        <span className="text-[12.5px] font-medium text-mv-ink">{row.mapping.inventoryItem.name}</span>
                        <span className="ml-2 font-mono text-[11.5px] font-semibold text-mv-green-dark">
                          {row.mapping.inventoryItem.quantityOnHand} {row.mapping.inventoryItem.unit}
                        </span>
                      </div>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleUnlink(row)}
                        disabled={isProcessing}
                        title="Dissocier cet article"
                        className="text-mv-ink-faint hover:text-mv-red"
                      >
                        <Unlink size={13} />
                      </Button>
                    </div>
                  ) : (
                    <select
                      defaultValue={row.autoSuggested ? inventoryItems.find((i) => normalizeItemName(i.name) === normalizeItemName(row.name))?.id ?? "" : ""}
                      onChange={(e) => handleLink(row, e.target.value)}
                      disabled={isProcessing}
                      className="h-8 max-w-[220px] truncate rounded-lg border border-mv-border bg-mv-surface px-2 text-[12px] text-mv-ink focus:border-mv-green focus:outline-none"
                    >
                      <option value="" disabled>
                        Associer à un article d&apos;inventaire…
                      </option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.quantityOnHand} {item.unit})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

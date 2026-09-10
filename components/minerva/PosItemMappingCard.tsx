"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Square, Clover, Toast } from "@/components/ui/BrandIcons";
import {
  Link2,
  Unlink,
  Plus,
  RefreshCw,
  Search,
  Check,
  AlertTriangle,
  Store,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  getPosItemMappingsAction,
  upsertPosItemMappingAction,
  createMenuItemFromPosAction,
  resyncMenuToPosAction,
} from "@/app/[locale]/(app)/menu/actions";
import type { PosItemMapping } from "@/lib/pos/item-mapping";
import type { PosProvider } from "@/lib/data/pos-connections";
import type { MenuItem } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

interface PosItemMappingCardProps {
  restaurantId: string;
  menuItems: MenuItem[];
  onItemCreated?: (item: MenuItem) => void;
}

function ProviderBadge({ provider }: { provider: PosProvider }) {
  if (provider === "square") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-mv-cream-soft px-2 py-0.5 text-[11px] font-medium text-mv-ink">
        <Square width={13} height={13} />
        Square
      </span>
    );
  }
  if (provider === "clover") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-mv-cream-soft px-2 py-0.5 text-[11px] font-medium text-mv-ink">
        <Clover width={13} height={13} />
        Clover
      </span>
    );
  }
  if (provider === "toast") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-mv-cream-soft px-2 py-0.5 text-[11px] font-medium text-mv-ink">
        <Toast width={13} height={13} />
        Toast POS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-mv-cream-soft px-2 py-0.5 text-[11px] font-medium text-mv-ink">
      <Store size={13} />
      {provider}
    </span>
  );
}

export function PosItemMappingCard({
  restaurantId,
  menuItems,
  onItemCreated,
}: PosItemMappingCardProps) {
  const [mappings, setMappings] = useState<PosItemMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unmapped" | "mapped">("all");
  const [isPending, startTransition] = useTransition();
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);

  async function handleResync() {
    setResyncing(true);
    const result = await resyncMenuToPosAction(restaurantId);
    setResyncing(false);
    if (result.providers === 0) {
      toast.info("Aucun compte Clover/Square connecté.");
    } else {
      toast.success(`Synchronisé : ${result.pushed} envoyé(s), ${result.pulled} reçu(s) depuis le POS.`);
      loadMappings();
    }
  }

  async function loadMappings() {
    setLoading(true);
    try {
      const data = await getPosItemMappingsAction(restaurantId);
      setMappings(data);
      // If there are unmapped items, auto-focus on them to guide the restaurateur
      if (data.some((m) => !m.menuItemId)) {
        setFilterStatus("unmapped");
      }
    } catch (err) {
      console.error("Failed to load POS item mappings:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMappings();
  }, [restaurantId]);

  const unmappedCount = useMemo(
    () => mappings.filter((m) => !m.menuItemId).length,
    [mappings]
  );
  const mappedCount = useMemo(
    () => mappings.filter((m) => Boolean(m.menuItemId)).length,
    [mappings]
  );

  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      if (selectedProvider !== "all" && m.provider !== selectedProvider) {
        return false;
      }
      if (filterStatus === "unmapped" && m.menuItemId) {
        return false;
      }
      if (filterStatus === "mapped" && !m.menuItemId) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = m.externalItemName.toLowerCase().includes(q);
        const matchesMapped = m.menuItem?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesMapped) return false;
      }
      return true;
    });
  }, [mappings, selectedProvider, filterStatus, search]);

  async function handleLinkItem(mapping: PosItemMapping, targetMenuItemId: string) {
    if (!targetMenuItemId) return;
    setActionInProgressId(mapping.id);
    startTransition(async () => {
      const ok = await upsertPosItemMappingAction(
        restaurantId,
        mapping.provider,
        mapping.externalItemId,
        mapping.externalItemName,
        targetMenuItemId
      );
      if (ok) {
        const found = menuItems.find((i) => i.id === targetMenuItemId);
        setMappings((prev) =>
          prev.map((m) =>
            m.id === mapping.id
              ? {
                  ...m,
                  menuItemId: targetMenuItemId,
                  autoMatched: false,
                  menuItem: found
                    ? { id: found.id, name: found.name, price: found.price, category: found.category }
                    : null,
                }
              : m
          )
        );
        toast.success(`« ${mapping.externalItemName} » associé à « ${found?.name ?? "plat"} »`);
      } else {
        toast.error("Échec de l'association de l'article");
      }
      setActionInProgressId(null);
    });
  }

  async function handleUnlinkItem(mapping: PosItemMapping) {
    setActionInProgressId(mapping.id);
    startTransition(async () => {
      const ok = await upsertPosItemMappingAction(
        restaurantId,
        mapping.provider,
        mapping.externalItemId,
        mapping.externalItemName,
        null
      );
      if (ok) {
        setMappings((prev) =>
          prev.map((m) =>
            m.id === mapping.id
              ? { ...m, menuItemId: null, autoMatched: false, menuItem: null }
              : m
          )
        );
        toast.info(`« ${mapping.externalItemName} » dissocié du menu`);
      } else {
        toast.error("Échec de la dissociation");
      }
      setActionInProgressId(null);
    });
  }

  async function handleCreateDishFromPos(mapping: PosItemMapping) {
    setActionInProgressId(mapping.id);
    startTransition(async () => {
      const newItem = await createMenuItemFromPosAction(
        restaurantId,
        mapping.provider,
        mapping.externalItemId,
        mapping.externalItemName,
        0,
        "Plats"
      );
      if (newItem) {
        onItemCreated?.(newItem);
        setMappings((prev) =>
          prev.map((m) =>
            m.id === mapping.id
              ? {
                  ...m,
                  menuItemId: newItem.id,
                  autoMatched: false,
                  menuItem: {
                    id: newItem.id,
                    name: newItem.name,
                    price: newItem.price,
                    category: newItem.category,
                  },
                }
              : m
          )
        );
        toast.success(`Plat « ${newItem.name} » ajouté au menu et associé !`);
      } else {
        toast.error("Impossible de créer le plat");
      }
      setActionInProgressId(null);
    });
  }

  // If no POS items have been ingested yet across any POS, return null to avoid cluttering
  if (!loading && mappings.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader
        eyebrow="Synchronisation POS & Caisse"
        title="Correspondance des articles POS"
        description="Associez les articles encaissés (Square, Clover, Toast) à vos fiches plats pour le suivi du Menu Engineering et des stocks de recettes."
        action={
          <div className="flex items-center gap-2">
            {unmappedCount > 0 ? (
              <Badge tone="amber" className="flex items-center gap-1">
                <AlertTriangle size={12} />
                {unmappedCount} non associé{unmappedCount > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge tone="green" className="flex items-center gap-1">
                <Check size={12} />
                {mappedCount} associé{mappedCount > 1 ? "s" : ""}
              </Badge>
            )}
            <Button size="sm" variant="secondary" onClick={handleResync} disabled={resyncing} className="text-[11.5px]">
              <RefreshCw size={13} className={cn(resyncing && "animate-spin")} />
              Resynchroniser tout
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadMappings}
              disabled={loading || isPending}
              aria-label="Rafraîchir"
            >
              <RefreshCw size={14} className={cn((loading || isPending) && "animate-spin")} />
            </Button>
          </div>
        }
      />

      {/* Filter and search bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-mv-border-soft pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterStatus("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors",
              filterStatus === "all"
                ? "bg-mv-green text-mv-cream-soft"
                : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-border-soft"
            )}
          >
            Tous ({mappings.length})
          </button>
          <button
            onClick={() => setFilterStatus("unmapped")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors",
              filterStatus === "unmapped"
                ? "bg-mv-amber text-mv-cream-soft"
                : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-border-soft"
            )}
          >
            Non associés ({unmappedCount})
          </button>
          <button
            onClick={() => setFilterStatus("mapped")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors",
              filterStatus === "mapped"
                ? "bg-mv-green-dark text-mv-cream-soft"
                : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-border-soft"
            )}
          >
            Associés ({mappedCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
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
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="h-8 rounded-lg border border-mv-border bg-mv-surface px-2 text-[12px] text-mv-ink focus:border-mv-green focus:outline-none"
          >
            <option value="all">Tous les POS</option>
            <option value="square">Square</option>
            <option value="clover">Clover</option>
            <option value="toast">Toast POS</option>
          </select>
        </div>
      </div>

      {/* Items list */}
      {filteredMappings.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-mv-ink-faint">
          Aucun article ne correspond à ces critères.
        </div>
      ) : (
        <div className="divide-y divide-mv-border-soft">
          {filteredMappings.map((m) => {
            const isProcessing = actionInProgressId === m.id;
            return (
              <div
                key={m.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* POS item info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ProviderBadge provider={m.provider} />
                    <span className="truncate text-[13.5px] font-semibold text-mv-ink">
                      {m.externalItemName}
                    </span>
                    {m.autoMatched && m.menuItemId && (
                      <span className="inline-flex items-center gap-1 rounded bg-mv-green-tint px-1.5 py-0.5 text-[10px] font-semibold text-mv-green-dark">
                        <Sparkles size={10} /> Auto
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] font-mono text-mv-ink-faint">
                    ID: {m.externalItemId}
                  </p>
                </div>

                {/* Mapping controls */}
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {m.menuItemId && m.menuItem ? (
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-mv-cream-soft px-3 py-1 text-right">
                        <span className="text-[12.5px] font-medium text-mv-ink">
                          {m.menuItem.name}
                        </span>
                        {m.menuItem.category && (
                          <span className="ml-1.5 text-[11px] text-mv-ink-faint">
                            ({m.menuItem.category})
                          </span>
                        )}
                        <span className="ml-2 font-mono text-[11.5px] font-semibold text-mv-green-dark">
                          {formatCurrency(m.menuItem.price)}
                        </span>
                      </div>

                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleUnlinkItem(m)}
                        disabled={isProcessing}
                        title="Dissocier cet article"
                        className="text-mv-ink-faint hover:text-mv-red"
                      >
                        <Unlink size={13} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        defaultValue=""
                        onChange={(e) => handleLinkItem(m, e.target.value)}
                        disabled={isProcessing}
                        className="h-8 max-w-[200px] truncate rounded-lg border border-mv-border bg-mv-surface px-2 text-[12px] text-mv-ink focus:border-mv-green focus:outline-none"
                      >
                        <option value="" disabled>
                          Associer à un plat existant…
                        </option>
                        {menuItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({formatCurrency(item.price)})
                          </option>
                        ))}
                      </select>

                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => handleCreateDishFromPos(m)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 text-[11.5px]"
                      >
                        <Plus size={12} />
                        Créer le plat
                      </Button>
                    </div>
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

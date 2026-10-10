"use client";


import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { InventoryItem, InventoryMovementType, Supplier } from "@/lib/types";
import { PackageSearch, Plus, Trash2, TriangleAlert, ShoppingCart, ArrowRight, Sparkles } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { createInventoryItemAction, deleteInventoryItemAction, logMovementAction } from "./actions";
import { notifyError } from "@/lib/notify-error";
import Link from "next/link";
import { PosInventoryMappingCard } from "@/components/minerva/PosInventoryMappingCard";
import type { CatalogPosProvider } from "@/lib/pos/catalog-sync";

function buildMovementLabel(t: (key: string) => string): Record<InventoryMovementType, string> {
  return {
  reception: t("receiving"),
  utilisation: "Utilisation",
  gaspillage: "Gaspillage",
  ajustement: "Ajustement",
};
}

function stockStatus(item: InventoryItem, t: (key: string) => string): { tone: "green" | "amber" | "red" | "neutral"; label: string; fraction: number } {
  if (item.parLevel == null || item.parLevel <= 0) {
    return { tone: "neutral", label: t("noThreshold"), fraction: 1 };
  }
  const fraction = Math.min(1, item.quantityOnHand / item.parLevel);
  if (item.quantityOnHand <= 0) return { tone: "red", label: t("soldOutLabel"), fraction: 0 };
  if (item.quantityOnHand < item.parLevel) return { tone: "amber", label: t("lowStockLabel"), fraction };
  return { tone: "green", label: t("okLabel"), fraction };
}

function StockGauge({ item }: { item: InventoryItem }) {
  const t = useTranslations("inventoryView");
  const status = stockStatus(item, t);
  const barColor =
    status.tone === "red" ? "bg-mv-red" : status.tone === "amber" ? "bg-mv-amber" : "bg-mv-green";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-mv-ink/[0.08]">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(4, status.fraction * 100)}%` }} />
      </div>
      <span className="text-[12px] text-mv-ink-soft">
        {item.quantityOnHand} {item.unit}
      </span>
    </div>
  );
}

function NewInventoryItemModal({
  restaurantId,
  suppliers,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  suppliers: Supplier[];
  open: boolean;
  onClose: () => void;
  onCreated: (item: InventoryItem) => void;
}) {
  const t = useTranslations("inventoryView");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const item = await createInventoryItemAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        category: String(form.get("category") ?? "") || null,
        unit: String(form.get("unit") ?? t("unit2")),
        quantityOnHand: Number(form.get("quantityOnHand") ?? 0),
        parLevel: String(form.get("parLevel") ?? "") ? Number(form.get("parLevel")) : null,
        unitCost: Number(form.get("unitCost") ?? 0),
        supplierId: String(form.get("supplierId") ?? "") || null,
      });
      if (item) {
        onCreated(item);
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError(t("couldNotAddThe"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvel article" description={t("startingQuantityRestockingThreshold")} width={600}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom">
            <Input name="name" placeholder="Ex : Farine tout usage" required autoFocus />
          </Field>
          <Field label={t("category")} hint="Optionnel">
            <Input name="category" placeholder="Ex : Sec" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("unit")}>
            <Input name="unit" placeholder={t("kgUnitL")} defaultValue={t("unit2")} required />
          </Field>
          <Field label={t("startingQuantity")}>
            <Input name="quantityOnHand" type="number" min="0" step="0.5" defaultValue="0" />
          </Field>
          <Field label={t("restockTarget")} hint={t("theOwnerAlertTriggers")}>
            <Input name="parLevel" type="number" min="0" step="0.5" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("unitCost")}>
            <Input name="unitCost" type="number" min="0" step="0.01" required />
          </Field>
          <Field label="Fournisseur" hint="Optionnel">
            <Select name="supplierId" defaultValue="">
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("creating") : t("create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MovementModal({
  restaurantId,
  item,
  open,
  onClose,
  onUpdated,
}: {
  restaurantId: string;
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (item: InventoryItem) => void;
}) {
  const tv = useTranslations("inventoryView");
  const [type, setType] = useState<InventoryMovementType>("reception");
  const [adjustDirection, setAdjustDirection] = useState<"add" | "remove">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    const form = new FormData(e.currentTarget);
    const enteredQuantity = Number(form.get("quantity") ?? 0);
    // The field always asks for a positive magnitude — only "ajustement"
    // needs a direction, since it's the one type meant to reconcile a
    // physical count either way instead of always moving stock one way.
    const quantity = type === "ajustement" && adjustDirection === "remove" ? -enteredQuantity : enteredQuantity;
    const reason = String(form.get("reason") ?? "") || null;

    setIsSubmitting(true);
    try {
      const updated = await logMovementAction(restaurantId, item.id, type, quantity, reason);
      if (updated) {
        onUpdated(updated);
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError(tv("couldNotRecordThe"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!item) return null;

  return (
    <Modal open={open} onClose={onClose} title="Mouvement de stock" description={item.name}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as InventoryMovementType)}>
            {(Object.keys(buildMovementLabel(tv)) as InventoryMovementType[]).map((t) => (
              <option key={t} value={t}>
                {buildMovementLabel(tv)[t]}
              </option>
            ))}
          </Select>
        </Field>
        {type === "ajustement" && (
          <Field label={tv("correctionDirection")} hint={tv("correctionHint")}>
            <Select value={adjustDirection} onChange={(e) => setAdjustDirection(e.target.value as "add" | "remove")}>
              <option value="add">{tv("addToTheCount")}</option>
              <option value="remove">{tv("removeFromTheCount")}</option>
            </Select>
          </Field>
        )}
        <Field label={tv("quantityUnit", { unit: item.unit })}>
          <Input name="quantity" type="number" min="0.01" step="0.01" required autoFocus />
        </Field>
        {type === "gaspillage" && (
          <Field label="Raison" hint={tv("recordedAsAWaste")}>
            <Input name="reason" placeholder={tv("eGExpiredDamaged")} />
          </Field>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tv("saving") : tv("save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function WasteSummaryCard({ wasteSummary }: { wasteSummary: { itemId: string; itemName: string; cost: number }[] }) {
  const t = useTranslations("inventoryView");
  const locale = useLocale();
  const top = wasteSummary.slice(0, 5);
  const total = wasteSummary.reduce((sum, r) => sum + r.cost, 0);
  const max = top[0]?.cost ?? 1;

  return (
    <Card>
      <CardHeader
        eyebrow="Ce mois-ci"
        title="Gaspillage"
        description={total > 0 ? `${formatCurrency(total, locale)} au total` : t("noWasteRecordedThis")}
      />
      {top.length > 0 && (
        <div className="space-y-1.5">
          {top.map((row) => (
            <div key={row.itemId} className="relative overflow-hidden rounded-md">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-mv-red/10"
                style={{ width: `${Math.max(6, (row.cost / max) * 100)}%` }}
              />
              <div className="relative flex items-center justify-between px-2.5 py-1.5">
                <span className="truncate text-[12.5px] font-medium text-mv-ink">{row.itemName}</span>
                <span className="shrink-0 text-[12.5px] font-semibold text-mv-red">{formatCurrency(row.cost, locale)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function InventaireView({
  restaurantId,
  initialItems,
  suppliers,
  wasteSummary,
  connectedProviders,
}: {
  restaurantId: string | null;
  initialItems: InventoryItem[];
  suppliers: Supplier[];
  wasteSummary: { itemId: string; itemName: string; cost: number }[];
  connectedProviders: CatalogPosProvider[];
}) {
  const t = useTranslations("inventoryView");
  const locale = useLocale();
  const { role } = useApp();
  const [items, setItems] = useState(initialItems);
  const [createOpen, setCreateOpen] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);

  const canManage = role === "owner" || role === "manager";
  const canCreate = Boolean(restaurantId) && (role === "owner" || role === "manager" || role === "staff");
  const suppliersById = new Map(suppliers.map((s) => [s.id, s]));

  function handleUpdated(updated: InventoryItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleDeleted(id: string, name: string) {
    if (!restaurantId) return;
    if (!window.confirm(t("removeNameFromThe", { name }))) return;
    deleteInventoryItemAction(restaurantId, id).then((ok) => {
      if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
      else notifyError(t("deletionFailed"));
    });
  }

  const lowStockItems = useMemo(
    () => items.filter((i) => stockStatus(i, t).tone === "amber" || stockStatus(i, t).tone === "red"),
    [items, t]
  );

  const estimatedRestockCost = useMemo(
    () =>
      lowStockItems.reduce(
        (acc, i) => acc + Math.max(0, (i.parLevel ?? 0) - i.quantityOnHand) * (i.unitCost || 0),
        0
      ),
    [lowStockItems]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("operations")}
        title={t("inventoryTitle")}
        description={t("quantitiesOnHandRestocking")}
        action={
          canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nouvel article
            </Button>
          )
        }
      />

      {restaurantId && connectedProviders.length > 0 && (
        <PosInventoryMappingCard restaurantId={restaurantId} inventoryItems={items} connectedProviders={connectedProviders} />
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start">
          <WasteSummaryCard wasteSummary={wasteSummary} />

          {lowStockItems.length > 0 ? (
            <Card className="border-mv-amber/40 bg-gradient-to-br from-mv-amber-tint/40 to-mv-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mv-amber-tint text-mv-amber-dark border border-mv-amber/30">
                    <TriangleAlert size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-[16px] font-bold text-mv-ink">
                        {t("itemsToRestock", { count: lowStockItems.length })}
                      </p>
                      <Badge tone="amber">{t("stockPriority")}</Badge>
                    </div>
                    <p className="text-[12.5px] text-mv-ink-soft mt-0.5">
                      {t("estimatedCostToReach")}{" "}
                      <span className="font-semibold text-mv-ink font-mono">{formatCurrency(estimatedRestockCost, locale)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-mv-amber/20 pt-3">
                {lowStockItems.slice(0, 4).map((i) => (
                  <span
                    key={i.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-mv-cream px-2 py-1 text-[12px] font-medium text-mv-ink-soft"
                  >
                    <span className="font-semibold text-mv-ink">{i.name}</span>
                    <span className="text-mv-red">({i.quantityOnHand} / {i.parLevel} {i.unit})</span>
                  </span>
                ))}
                {lowStockItems.length > 4 && (
                  <span className="inline-flex items-center px-1.5 py-1 text-[12px] text-mv-ink-faint">
                    +{lowStockItems.length - 4} autres
                  </span>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Link href="/fournisseurs">
                  <Button size="sm" variant="secondary" className="text-[12px] h-7 px-3 gap-1.5 border-mv-amber/50 text-mv-amber-dark hover:bg-mv-amber hover:text-white">
                    <ShoppingCart size={13} /> {t("placeASupplierOrder")} <ArrowRight size={12} />
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="border-mv-green/30 bg-gradient-to-br from-mv-green-tint/30 to-mv-surface p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="font-display text-[15px] font-bold text-mv-ink">{t("optimalStockLevels")}</p>
                  <p className="text-[12px] text-mv-ink-soft">{t("allItemsWithA")}</p>
                </div>
              </div>
              <Badge tone="green">{t("healthyStock")}</Badge>
            </Card>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Aucun article"
          description={t("addYourItemsTo")}
          action={
            canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Nouvel article
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <THead>
            <Th>{t("item")}</Th>
            <Th>{t("supplier")}</Th>
            <Th>{t("quantity")}</Th>
            <Th>{t("status")}</Th>
            <Th className="text-right">{t("unitCost")}</Th>
            <Th className="text-right">{t("actions")}</Th>
          </THead>
          <tbody>
            {items.map((item) => {
              const status = stockStatus(item, t);
              return (
                <Tr key={item.id}>
                  <Td className="font-semibold text-mv-ink">
                    {item.name}
                    {item.category && <span className="ml-1.5 text-[12px] font-normal text-mv-ink-faint">— {item.category}</span>}
                  </Td>
                  <Td className="text-mv-ink-soft">{item.supplierId ? suppliersById.get(item.supplierId)?.name ?? "—" : "—"}</Td>
                  <Td>
                    <StockGauge item={item} />
                  </Td>
                  <Td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Td>
                  <Td className="text-right text-mv-ink-soft">{formatCurrency(item.unitCost, locale)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {canCreate && (
                        <button
                          onClick={() => setMovementItem(item)}
                          className="rounded-md px-2 py-1 text-[12px] font-medium text-mv-green-dark hover:bg-mv-green/10"
                        >
                          Mouvement
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleDeleted(item.id, item.name)}
                          aria-label="Supprimer"
                          className="rounded-md p-1.5 text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-red"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {restaurantId && (
        <NewInventoryItemModal
          restaurantId={restaurantId}
          suppliers={suppliers}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(item) => setItems((prev) => [...prev, item])}
        />
      )}

      {restaurantId && (
        <MovementModal
          restaurantId={restaurantId}
          item={movementItem}
          open={movementItem !== null}
          onClose={() => setMovementItem(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

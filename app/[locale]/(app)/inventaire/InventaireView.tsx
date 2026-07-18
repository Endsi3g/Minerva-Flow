"use client";

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
import { PackageSearch, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createInventoryItemAction, deleteInventoryItemAction, logMovementAction } from "./actions";
import { notifyError } from "@/lib/notify-error";

const movementLabel: Record<InventoryMovementType, string> = {
  reception: "Réception",
  utilisation: "Utilisation",
  gaspillage: "Gaspillage",
  ajustement: "Ajustement",
};

function stockStatus(item: InventoryItem): { tone: "green" | "amber" | "red" | "neutral"; label: string; fraction: number } {
  if (item.parLevel == null || item.parLevel <= 0) {
    return { tone: "neutral", label: "Sans seuil", fraction: 1 };
  }
  const fraction = Math.min(1, item.quantityOnHand / item.parLevel);
  if (item.quantityOnHand <= 0) return { tone: "red", label: "Épuisé", fraction: 0 };
  if (item.quantityOnHand < item.parLevel) return { tone: "amber", label: "Stock bas", fraction };
  return { tone: "green", label: "OK", fraction };
}

function StockGauge({ item }: { item: InventoryItem }) {
  const status = stockStatus(item);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const item = await createInventoryItemAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        category: String(form.get("category") ?? "") || null,
        unit: String(form.get("unit") ?? "unité"),
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
        notifyError("L'ajout de l'article a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvel article" description="Quantité initiale, seuil de réapprovisionnement et coût unitaire." width={600}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom">
            <Input name="name" placeholder="Ex : Farine tout usage" required autoFocus />
          </Field>
          <Field label="Catégorie" hint="Optionnel">
            <Input name="category" placeholder="Ex : Sec" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Unité">
            <Input name="unit" placeholder="kg, unité, L…" defaultValue="unité" required />
          </Field>
          <Field label="Quantité initiale">
            <Input name="quantityOnHand" type="number" min="0" step="0.5" defaultValue="0" />
          </Field>
          <Field label="Seuil de réappro" hint="Optionnel">
            <Input name="parLevel" type="number" min="0" step="0.5" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Coût unitaire">
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
            {isSubmitting ? "Création…" : "Créer"}
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
  const [type, setType] = useState<InventoryMovementType>("reception");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    const form = new FormData(e.currentTarget);
    const quantity = Number(form.get("quantity") ?? 0);
    const reason = String(form.get("reason") ?? "") || null;

    setIsSubmitting(true);
    try {
      const updated = await logMovementAction(restaurantId, item.id, type, quantity, reason);
      if (updated) {
        onUpdated(updated);
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError("L'enregistrement du mouvement a échoué.");
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
            {(Object.keys(movementLabel) as InventoryMovementType[]).map((t) => (
              <option key={t} value={t}>
                {movementLabel[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`Quantité (${item.unit})`}>
          <Input name="quantity" type="number" min="0.01" step="0.01" required autoFocus />
        </Field>
        {type === "gaspillage" && (
          <Field label="Raison" hint="Consigné comme dépense « Gaspillage »">
            <Input name="reason" placeholder="Ex : périmé, endommagé, surproduction" />
          </Field>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function WasteSummaryCard({ wasteSummary }: { wasteSummary: { itemId: string; itemName: string; cost: number }[] }) {
  const top = wasteSummary.slice(0, 5);
  const total = wasteSummary.reduce((sum, r) => sum + r.cost, 0);
  const max = top[0]?.cost ?? 1;

  return (
    <Card>
      <CardHeader
        eyebrow="Ce mois-ci"
        title="Gaspillage"
        description={total > 0 ? `${formatCurrency(total)} au total` : "Aucun gaspillage enregistré ce mois-ci"}
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
                <span className="shrink-0 text-[12.5px] font-semibold text-mv-red">{formatCurrency(row.cost)}</span>
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
}: {
  restaurantId: string | null;
  initialItems: InventoryItem[];
  suppliers: Supplier[];
  wasteSummary: { itemId: string; itemName: string; cost: number }[];
}) {
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
    if (!window.confirm(`Retirer "${name}" de l'inventaire ?`)) return;
    deleteInventoryItemAction(restaurantId, id).then((ok) => {
      if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
      else notifyError("La suppression a échoué.");
    });
  }

  const lowStockCount = items.filter((i) => stockStatus(i).tone === "amber" || stockStatus(i).tone === "red").length;

  return (
    <div>
      <PageHeader
        eyebrow="Opérations"
        title="Inventaire"
        description="Quantités en main, seuils de réapprovisionnement et suivi du gaspillage."
        action={
          canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nouvel article
            </Button>
          )
        }
      />

      {items.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <WasteSummaryCard wasteSummary={wasteSummary} />
          {lowStockCount > 0 && (
            <Card>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-amber-bg text-mv-amber">
                  <TriangleAlert size={16} />
                </div>
                <div>
                  <p className="font-display text-[16px] font-medium text-mv-ink">
                    {lowStockCount} article{lowStockCount > 1 ? "s" : ""} sous le seuil
                  </p>
                  <p className="text-[12.5px] text-mv-ink-faint">À réapprovisionner bientôt.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Aucun article"
          description="Ajoutez vos articles pour suivre les quantités en main et le gaspillage."
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
            <Th>Article</Th>
            <Th>Fournisseur</Th>
            <Th>Quantité</Th>
            <Th>Statut</Th>
            <Th className="text-right">Coût unitaire</Th>
            <Th className="text-right">Actions</Th>
          </THead>
          <tbody>
            {items.map((item) => {
              const status = stockStatus(item);
              return (
                <Tr key={item.id}>
                  <Td className="font-semibold text-mv-ink">
                    {item.name}
                    {item.category && <span className="ml-1.5 text-[11.5px] font-normal text-mv-ink-faint">— {item.category}</span>}
                  </Td>
                  <Td className="text-mv-ink-soft">{item.supplierId ? suppliersById.get(item.supplierId)?.name ?? "—" : "—"}</Td>
                  <Td>
                    <StockGauge item={item} />
                  </Td>
                  <Td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Td>
                  <Td className="text-right text-mv-ink-soft">{formatCurrency(item.unitCost)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {canCreate && (
                        <button
                          onClick={() => setMovementItem(item)}
                          className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-green-dark hover:bg-mv-green/10"
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

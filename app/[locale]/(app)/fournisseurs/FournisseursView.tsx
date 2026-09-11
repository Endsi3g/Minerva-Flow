"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getSuppliersAction,
  createSupplierAction,
  deleteSupplierAction,
  getPurchaseOrdersAction,
  createPurchaseOrderAction,
  updatePurchaseOrderStatusAction,
  deletePurchaseOrderAction,
  logPurchaseOrderExpenseAction,
  getSuggestedReordersAction,
  generateSuggestedPurchaseOrdersAction,
} from "./actions";
import { useApp } from "@/lib/app-context";
import { DeliveryTrackerCard } from "@/components/minerva/DeliveryTrackerCard";
import type { PurchaseOrder, PurchaseOrderStatus, Supplier, InventoryItem } from "@/lib/types";
import type { SuggestedReorderGroup } from "@/lib/engine/reorder";
import type { PurchaseOrderItemInput } from "@/lib/data/purchase-orders";
import { Package, Plus, Trash2, Truck, Sparkles, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify-error";

const statusLabel: Record<PurchaseOrderStatus, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  recue: "Reçue",
  annulee: "Annulée",
};

const statusTone: Record<PurchaseOrderStatus, "neutral" | "amber" | "green" | "red"> = {
  brouillon: "neutral",
  envoyee: "amber",
  recue: "green",
  annulee: "red",
};

function orderTotal(order: PurchaseOrder): number {
  return order.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
}

function SuppliersCard({
  restaurantId,
  suppliers,
  onChange,
}: {
  restaurantId: string;
  suppliers: Supplier[];
  onChange: (suppliers: Supplier[]) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const supplier = await createSupplierAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        contactName: String(form.get("contactName") ?? "") || null,
        phone: String(form.get("phone") ?? "") || null,
        email: String(form.get("email") ?? "") || null,
        category: String(form.get("category") ?? "") || null,
        address: String(form.get("address") ?? "") || null,
      });
      if (supplier) {
        onChange([...suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name)));
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError("L'ajout du fournisseur a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteSupplierAction(restaurantId, id);
    if (ok) onChange(suppliers.filter((s) => s.id !== id));
  }

  return (
    <Card>
      <CardHeader eyebrow="Répertoire" title="Fournisseurs" description="Vos fournisseurs, pour créer des commandes rapidement." />
      <div className="mb-3 space-y-1.5">
        {suppliers.length === 0 && <p className="text-[12.5px] text-mv-ink-faint">Aucun fournisseur ajouté.</p>}
        {suppliers.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2">
            <div>
              <p className="text-[13px] font-medium text-mv-ink">{s.name}</p>
              {(s.contactName || s.phone) && (
                <p className="text-[11.5px] text-mv-ink-faint">
                  {[s.contactName, s.phone].filter(Boolean).join(" — ")}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(s.id)}
              aria-label="Retirer le fournisseur"
              className="text-mv-ink-faint transition-colors hover:text-mv-red"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="space-y-2 border-t border-mv-border-soft pt-3">
        <Field label="Nom">
          <Input name="name" placeholder="Ex : Distribution Colabor" required />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Contact" hint="Optionnel">
            <Input name="contactName" placeholder="Ex : Marie" />
          </Field>
          <Field label="Téléphone" hint="Optionnel">
            <Input name="phone" type="tel" />
          </Field>
        </div>
        <Field label="Courriel" hint="Optionnel">
          <Input name="email" type="email" />
        </Field>
        <Field label="Adresse" hint="Optionnel — active le suivi de livraison sur une commande">
          <Input name="address" placeholder="Ex : 850 rue Ontario Est, Montréal" />
        </Field>
        <Button type="submit" size="sm" disabled={isSubmitting} className="w-full">
          <Plus size={14} /> Ajouter
        </Button>
      </form>
    </Card>
  );
}

function NewOrderModal({
  restaurantId,
  suppliers,
  inventoryItems = [],
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  suppliers: Supplier[];
  inventoryItems?: InventoryItem[];
  open: boolean;
  onClose: () => void;
  onCreated: (o: PurchaseOrder) => void;
}) {
  const [items, setItems] = useState<PurchaseOrderItemInput[]>([
    { itemName: "", quantity: 1, unit: "unité", unitCost: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateItem(index: number, patch: Partial<PurchaseOrderItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const validItems = items.filter((i) => i.itemName.trim());

    setIsSubmitting(true);
    try {
      const order = await createPurchaseOrderAction(restaurantId, {
        supplierId: String(form.get("supplierId") ?? ""),
        expectedDate: String(form.get("expectedDate") ?? "") || null,
        notes: String(form.get("notes") ?? "") || null,
        items: validItems,
      });
      if (order) {
        onCreated(order);
        onClose();
        setItems([{ itemName: "", quantity: 1, unit: "unité", unitCost: 0 }]);
      } else {
        notifyError("La création de la commande a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (suppliers.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Nouvelle commande" description="Ajoutez d'abord un fournisseur.">
        <p className="text-[13px] text-mv-ink-soft">
          Ajoutez au moins un fournisseur dans le panneau de droite avant de créer une commande.
        </p>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle commande" description="Fournisseur, articles et quantités." width={680}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fournisseur">
            <Select name="supplierId" required>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Livraison attendue" hint="Optionnel">
            <Input name="expectedDate" type="date" />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-mv-ink-soft">Articles</p>
            {inventoryItems.length > 0 && (
              <span className="text-[11px] text-mv-ink-faint">Sélectionnez un ingrédient en stock ou saisissez librement</span>
            )}
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {inventoryItems.length > 0 && (
                  <select
                    value={item.inventoryItemId ?? ""}
                    onChange={(e) => {
                      const invId = e.target.value;
                      if (invId) {
                        const inv = inventoryItems.find((x) => x.id === invId);
                        if (inv) {
                          updateItem(i, {
                            inventoryItemId: inv.id,
                            itemName: inv.name,
                            unit: inv.unit,
                            unitCost: inv.unitCost,
                          });
                        }
                      } else {
                        updateItem(i, { inventoryItemId: null });
                      }
                    }}
                    className="h-9 max-w-[140px] truncate rounded-md border border-mv-border bg-mv-cream-soft px-2 text-[12px] text-mv-ink focus:border-mv-green focus:outline-none"
                    title="Associer à un article en inventaire"
                  >
                    <option value="">(Saisie libre)</option>
                    {inventoryItems.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                      </option>
                    ))}
                  </select>
                )}
                <Input
                  placeholder="Article (ex : Farine 20kg)"
                  value={item.itemName}
                  onChange={(e) => updateItem(i, { itemName: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  className="w-16"
                  aria-label="Quantité"
                />
                <Input
                  placeholder="unité"
                  value={item.unit}
                  onChange={(e) => updateItem(i, { unit: e.target.value })}
                  className="w-20"
                  aria-label="Unité"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => updateItem(i, { unitCost: Number(e.target.value) })}
                  className="w-24"
                  aria-label="Coût unitaire"
                />
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-mv-ink-faint hover:text-mv-red"
                  aria-label="Retirer l'article"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, { itemName: "", quantity: 1, unit: "unité", unitCost: 0 }])}
            className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-mv-green-dark hover:underline"
          >
            <Plus size={13} /> Ajouter un article
          </button>
        </div>

        <Field label="Notes" hint="Optionnel">
          <Input name="notes" placeholder="Ex : livrer avant 10h" />
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer la commande"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReceiveOrderModal({
  restaurantId,
  order,
  supplierName,
  open,
  onClose,
  onReceived,
}: {
  restaurantId: string;
  order: PurchaseOrder;
  supplierName: string;
  open: boolean;
  onClose: () => void;
  onReceived: (orderId: string, receivedTotalCost: number, unmatchedItems: string[]) => void;
}) {
  const [receipts, setReceipts] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((i) => [i.id, i.quantity]))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalReceivedCost = useMemo(() => {
    return order.items.reduce((sum, item) => {
      const qty = receipts[item.id] ?? item.quantity;
      return sum + qty * item.unitCost;
    }, 0);
  }, [order.items, receipts]);

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      const itemReceipts = order.items.map((i) => ({
        itemId: i.id,
        receivedQuantity: receipts[i.id] ?? i.quantity,
      }));
      const res = await updatePurchaseOrderStatusAction(restaurantId, order.id, "recue", itemReceipts);
      if (res.ok) {
        onReceived(order.id, res.receivedTotalCost ?? totalReceivedCost, res.unmatchedItemNames ?? []);
        onClose();
      } else {
        notifyError("La validation de la réception a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Réceptionner la commande"
      description={`Fournisseur : ${supplierName} · Vérifiez les quantités livrées pour mise à jour immédiate du stock.`}
      width={680}
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-mv-border-soft">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-mv-cream-soft text-[11px] font-semibold uppercase text-mv-ink-faint">
              <tr>
                <th className="py-2.5 px-3">Article</th>
                <th className="py-2.5 px-2 text-right">Commandé</th>
                <th className="py-2.5 px-2 text-right">Reçu</th>
                <th className="py-2.5 px-3 text-right">Total reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mv-border-soft">
              {order.items.map((item) => {
                const currentQty = receipts[item.id] ?? item.quantity;
                const lineCost = currentQty * item.unitCost;
                return (
                  <tr key={item.id} className="hover:bg-mv-cream-soft/40">
                    <td className="py-2.5 px-3 font-medium text-mv-ink">
                      <div>{item.itemName}</div>
                      <div className="text-[11px] text-mv-ink-faint">
                        {formatCurrency(item.unitCost)} / {item.unit}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-mv-ink-soft">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={currentQty}
                          onChange={(e) =>
                            setReceipts((prev) => ({
                              ...prev,
                              [item.id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="h-7 w-20 rounded border border-mv-border bg-mv-surface px-2 text-right font-mono text-[12px] text-mv-ink focus:border-mv-green focus:outline-none"
                        />
                        <span className="text-[11px] text-mv-ink-faint">{item.unit}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-mv-ink">
                      {formatCurrency(lineCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-mv-cream-soft p-3">
          <span className="text-[12.5px] font-medium text-mv-ink-soft">Valeur totale réceptionnée :</span>
          <span className="font-mono text-[15px] font-semibold text-mv-green-dark">
            {formatCurrency(totalReceivedCost)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
            <CheckCircle2 size={14} />
            {isSubmitting ? "Validation…" : "Confirmer la réception et entrer en stock"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SuggestedReordersModal({
  restaurantId,
  suggestions,
  open,
  onClose,
  onOrdersCreated,
}: {
  restaurantId: string;
  suggestions: SuggestedReorderGroup[];
  open: boolean;
  onClose: () => void;
  onOrdersCreated: () => void;
}) {
  const [localSuggestions, setLocalSuggestions] = useState(suggestions);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setLocalSuggestions(suggestions);
  }, [suggestions]);

  function handleQuantityChange(supplierIndex: number, itemIndex: number, newQty: number) {
    setLocalSuggestions((prev) =>
      prev.map((group, sIdx) => {
        if (sIdx !== supplierIndex) return group;
        const updatedItems = group.items.map((it, iIdx) => {
          if (iIdx !== itemIndex) return it;
          const cost = Math.round(newQty * it.unitCost * 100) / 100;
          return { ...it, suggestedQuantity: newQty, estimatedCost: cost };
        });
        const totalCost = updatedItems.reduce((sum, i) => sum + i.estimatedCost, 0);
        return { ...group, items: updatedItems, totalEstimatedCost: Math.round(totalCost * 100) / 100 };
      })
    );
  }

  async function handleGenerate() {
    setIsCreating(true);
    try {
      const res = await generateSuggestedPurchaseOrdersAction(restaurantId, localSuggestions);
      if (res.count > 0) {
        toast.success(`${res.count} commande(s) fournisseur(s) brouillon(s) créée(s) !`);
        if (res.skippedNoSupplierCount > 0) {
          toast.warning(
            `${res.skippedNoSupplierCount} article(s) n'ont pas été commandés car aucun fournisseur ne leur est assigné dans l'inventaire.`
          );
        }
        onOrdersCreated();
        onClose();
      } else {
        toast.info("Aucune commande n'a été créée.");
      }
    } finally {
      setIsCreating(false);
    }
  }

  const grandTotal = localSuggestions.reduce((sum, g) => sum + (g.supplierId ? g.totalEstimatedCost : 0), 0);
  const totalItemsCount = localSuggestions.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suggestions de réapprovisionnement"
      description="Commandes automatiques calculées à partir de vos stocks et seuils minimaux."
      width={720}
    >
      <div className="space-y-4">
        {localSuggestions.length === 0 ? (
          <div className="py-8 text-center text-mv-ink-faint">
            <Sparkles className="mx-auto mb-2 text-mv-green" size={24} />
            <p className="text-[13px] font-medium text-mv-ink">Vos stocks sont au niveau optimal !</p>
            <p className="text-[12px]">Aucun ingrédient n&apos;est actuellement sous son seuil de réapprovisionnement.</p>
          </div>
        ) : (
          <>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              {localSuggestions.map((group, sIdx) => (
                <div key={group.supplierId ?? "unassigned"} className="rounded-xl border border-mv-border bg-mv-surface p-3.5">
                  <div className="mb-2.5 flex items-center justify-between border-b border-mv-border-soft pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-[14px] font-semibold text-mv-ink">
                          {group.supplierName}
                        </h4>
                        {!group.supplierId && (
                          <Badge tone="amber">Sans fournisseur</Badge>
                        )}
                      </div>
                      {(group.supplierEmail || group.supplierPhone) && (
                        <p className="text-[11px] text-mv-ink-faint">
                          {[group.supplierEmail, group.supplierPhone].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[13px] font-semibold text-mv-ink">
                      {formatCurrency(group.totalEstimatedCost)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {group.items.map((item, iIdx) => (
                      <div
                        key={item.inventoryItemId}
                        className="flex items-center justify-between gap-2 rounded-lg bg-mv-cream-soft/70 px-2.5 py-1.5 text-[12.5px]"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-mv-ink">{item.itemName}</span>
                          <span className="ml-2 text-[11px] text-mv-ink-faint">
                            (Stock : {item.quantityOnHand} / Seuil : {item.parLevel} {item.unit})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={item.suggestedQuantity}
                              onChange={(e) =>
                                handleQuantityChange(sIdx, iIdx, Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="h-7 w-16 rounded border border-mv-border bg-mv-surface px-1.5 text-right font-mono text-[12px] text-mv-ink focus:border-mv-green focus:outline-none"
                            />
                            <span className="w-10 text-[11px] text-mv-ink-faint">{item.unit}</span>
                          </div>
                          <span className="w-16 text-right font-mono text-[12px] font-medium text-mv-ink">
                            {formatCurrency(item.estimatedCost)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-mv-cream-soft p-3">
              <div>
                <p className="text-[12.5px] font-medium text-mv-ink">
                  Total estimé pour {localSuggestions.filter((g) => g.supplierId).length} commande(s) :
                </p>
                <p className="text-[11px] text-mv-ink-faint">{totalItemsCount} article(s) à réapprovisionner</p>
              </div>
              <span className="font-mono text-[16px] font-bold text-mv-green-dark">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-3">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
                Fermer
              </Button>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isCreating || localSuggestions.filter((g) => g.supplierId).length === 0}
              >
                <Sparkles size={14} />
                {isCreating ? "Génération…" : "Créer les commandes brouillons"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export function FournisseursView({
  restaurantId,
  initialSuppliers,
  initialOrders,
  inventoryItems = [],
}: {
  restaurantId: string | null;
  initialSuppliers: Supplier[];
  initialOrders: PurchaseOrder[];
  inventoryItems?: InventoryItem[];
}) {
  const { role, restaurants, restaurantId: currentRestaurantId } = useApp();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [orders, setOrders] = useState(initialOrders);
  const [createOpen, setCreateOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<PurchaseOrder | null>(null);

  // Suggested reorders
  const [suggestedReordersOpen, setSuggestedReordersOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedReorderGroup[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Itemized receiving modal
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);

  const canManage = role === "owner" || role === "manager";
  const suppliersById = new Map(suppliers.map((s) => [s.id, s]));
  const currentRestaurant = restaurants.find((r) => r.id === currentRestaurantId);
  const trackingSupplier = trackingOrder ? suppliersById.get(trackingOrder.supplierId) : undefined;

  async function handleOpenSuggestedReorders() {
    if (!restaurantId) return;
    setIsLoadingSuggestions(true);
    try {
      const groups = await getSuggestedReordersAction(restaurantId);
      setSuggestions(groups);
      setSuggestedReordersOpen(true);
    } catch {
      notifyError("Impossible de charger les suggestions de réapprovisionnement.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  function handleOrderReceived(orderId: string, receivedTotalCost: number, unmatchedNames: string[]) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "recue" } : o)));
    if (unmatchedNames.length > 0) {
      toast.warning(
        `Commande reçue, mais le stock n'a pas été mis à jour pour : ${unmatchedNames.join(", ")} — ces noms d'article ne correspondent à aucun article d'inventaire existant.`
      );
    }
    if (receivedTotalCost > 0 && restaurantId) {
      toast(`Commande reçue — ${formatCurrency(receivedTotalCost)} d'inventaire.`, {
        description: "L'enregistrer aussi comme dépense dans Finance ?",
        action: {
          label: "Enregistrer",
          onClick: async () => {
            const ok = await logPurchaseOrderExpenseAction(restaurantId, orderId);
            if (ok) toast.success("Dépense enregistrée dans Finance.");
            else notifyError("L'enregistrement de la dépense a échoué.");
          },
        },
      });
    }
  }

  async function handleStatusChange(id: string, status: PurchaseOrderStatus) {
    if (!restaurantId) return;
    const result = await updatePurchaseOrderStatusAction(restaurantId, id, status);
    if (!result.ok) {
      notifyError("La mise à jour du statut a échoué.");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  async function handleDelete(id: string) {
    if (!restaurantId) return;
    const ok = await deletePurchaseOrderAction(restaurantId, id);
    if (ok) setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Opérations"
        title="Fournisseurs"
        description="Créez et suivez vos commandes auprès de vos fournisseurs."
        action={
          canManage &&
          restaurantId && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenSuggestedReorders}
                disabled={isLoadingSuggestions}
              >
                <Sparkles size={14} className="text-mv-green" />
                {isLoadingSuggestions ? "Analyse…" : "Suggérer réappro"}
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Nouvelle commande
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          {orders.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Aucune commande"
              description="Créez votre première commande fournisseur ou générez des suggestions de réassort."
              action={
                canManage &&
                restaurantId && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenSuggestedReorders}
                      disabled={isLoadingSuggestions}
                    >
                      <Sparkles size={14} className="text-mv-green" /> Suggérer réappro
                    </Button>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus size={15} /> Nouvelle commande
                    </Button>
                  </div>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Fournisseur</Th>
                <Th>Date</Th>
                <Th>Articles</Th>
                <Th>Total estimé</Th>
                <Th>Statut</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {orders.map((o) => (
                  <Tr key={o.id}>
                    <Td className="font-semibold text-mv-ink">
                      {suppliersById.get(o.supplierId)?.name ?? "—"}
                    </Td>
                    <Td className="text-mv-ink-soft">{formatDate(o.orderDate)}</Td>
                    <Td className="text-mv-ink-soft">
                      <span className="inline-flex items-center gap-1.5">
                        <Package size={13} /> {o.items.length}
                      </span>
                    </Td>
                    <Td className="font-medium text-mv-ink">{formatCurrency(orderTotal(o))}</Td>
                    <Td>
                      <Badge tone={statusTone[o.status]}>{statusLabel[o.status]}</Badge>
                    </Td>
                    <Td className="text-right">
                      {canManage && (
                        <div className="flex justify-end gap-1.5">
                          {o.status === "brouillon" && (
                            <button
                              onClick={() => handleStatusChange(o.id, "envoyee")}
                              className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-green-dark hover:bg-mv-green/10"
                            >
                              Envoyer
                            </button>
                          )}
                          {o.status === "envoyee" && (
                            <>
                              {suppliersById.get(o.supplierId)?.lng != null && currentRestaurant?.lng != null && (
                                <button
                                  onClick={() => setTrackingOrder(o)}
                                  className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-ink-soft hover:bg-mv-ink/5"
                                >
                                  Voir le trajet
                                </button>
                              )}
                              <button
                                onClick={() => setReceivingOrder(o)}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-medium text-mv-green-dark hover:bg-mv-green/10"
                              >
                                <CheckCircle2 size={12} /> Réceptionner
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(o.id)}
                            aria-label="Supprimer"
                            className="rounded-md p-1.5 text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-red"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {canManage && (
          <div className="xl:col-span-4">
            <SuppliersCard restaurantId={restaurantId!} suppliers={suppliers} onChange={setSuppliers} />
          </div>
        )}
      </div>

      {restaurantId && (
        <NewOrderModal
          restaurantId={restaurantId}
          suppliers={suppliers}
          inventoryItems={inventoryItems}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(o) => setOrders((prev) => [o, ...prev])}
        />
      )}

      {receivingOrder && restaurantId && (
        <ReceiveOrderModal
          restaurantId={restaurantId}
          order={receivingOrder}
          supplierName={suppliersById.get(receivingOrder.supplierId)?.name ?? "Fournisseur"}
          open={Boolean(receivingOrder)}
          onClose={() => setReceivingOrder(null)}
          onReceived={handleOrderReceived}
        />
      )}

      {restaurantId && (
        <SuggestedReordersModal
          restaurantId={restaurantId}
          suggestions={suggestions}
          open={suggestedReordersOpen}
          onClose={() => setSuggestedReordersOpen(false)}
          onOrdersCreated={async () => {
            const updatedOrders = await getPurchaseOrdersAction(restaurantId);
            setOrders(updatedOrders);
          }}
        />
      )}

      {trackingOrder && trackingSupplier?.lng != null && trackingSupplier?.lat != null && currentRestaurant?.lng != null && currentRestaurant?.lat != null && (
        <Modal open onClose={() => setTrackingOrder(null)} title="Suivi de livraison" width={640}>
          <DeliveryTrackerCard
            supplierName={trackingSupplier.name}
            origin={{ lng: trackingSupplier.lng, lat: trackingSupplier.lat }}
            destination={{ lng: currentRestaurant.lng, lat: currentRestaurant.lat }}
          />
        </Modal>
      )}
    </div>
  );
}

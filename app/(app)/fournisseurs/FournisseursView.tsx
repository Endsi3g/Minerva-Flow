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
  createPurchaseOrderAction,
  updatePurchaseOrderStatusAction,
  deletePurchaseOrderAction,
} from "./actions";
import { useApp } from "@/lib/app-context";
import { DeliveryTrackerCard } from "@/components/minerva/DeliveryTrackerCard";
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from "@/lib/types";
import type { PurchaseOrderItemInput } from "@/lib/data/purchase-orders";
import { Package, Plus, Trash2, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

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
        toast.error("L'ajout du fournisseur a échoué.");
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
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  suppliers: Supplier[];
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
        toast.error("La création de la commande a échoué.");
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
    <Modal open={open} onClose={onClose} title="Nouvelle commande" description="Fournisseur, articles et quantités." width={640}>
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
          <p className="mb-1.5 text-[12px] font-semibold text-mv-ink-soft">Articles</p>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
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

export function FournisseursView({
  restaurantId,
  initialSuppliers,
  initialOrders,
}: {
  restaurantId: string | null;
  initialSuppliers: Supplier[];
  initialOrders: PurchaseOrder[];
}) {
  const { role, restaurants, restaurantId: currentRestaurantId } = useApp();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [orders, setOrders] = useState(initialOrders);
  const [createOpen, setCreateOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<PurchaseOrder | null>(null);

  const canManage = role === "owner" || role === "manager";
  const suppliersById = new Map(suppliers.map((s) => [s.id, s]));
  const currentRestaurant = restaurants.find((r) => r.id === currentRestaurantId);
  const trackingSupplier = trackingOrder ? suppliersById.get(trackingOrder.supplierId) : undefined;

  async function handleStatusChange(id: string, status: PurchaseOrderStatus) {
    if (!restaurantId) return;
    const ok = await updatePurchaseOrderStatusAction(restaurantId, id, status);
    if (ok) setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
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
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nouvelle commande
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          {orders.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Aucune commande"
              description="Créez votre première commande fournisseur."
              action={
                canManage &&
                restaurantId && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus size={15} /> Nouvelle commande
                  </Button>
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
                                onClick={() => handleStatusChange(o.id, "recue")}
                                className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-green-dark hover:bg-mv-green/10"
                              >
                                Marquer reçue
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
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(o) => setOrders((prev) => [o, ...prev])}
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

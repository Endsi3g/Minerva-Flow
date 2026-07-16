"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import {
  classifyMenuItems,
  quadrantLabel,
  quadrantDescription,
  type MenuItemWithQuadrant,
} from "@/lib/menu-engineering";
import type { MenuItem, MenuQuadrant } from "@/lib/types";
import { UtensilsCrossed, Plus, Trash2, TrendingUp, Info, Pencil } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { createMenuItemAction, deleteMenuItemAction, recordSaleAction, updateMenuItemAction } from "./actions";
import { toast } from "sonner";

const quadrantTone: Record<MenuQuadrant, "green" | "amber" | "lime" | "neutral"> = {
  etoile: "green",
  cheval_bataille: "amber",
  enigme: "lime",
  poids_mort: "neutral",
};

const quadrantOrder: MenuQuadrant[] = ["etoile", "cheval_bataille", "enigme", "poids_mort"];

function NewMenuItemModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (item: MenuItem) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const item = await createMenuItemAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        category: String(form.get("category") ?? "") || null,
        price: Number(form.get("price") ?? 0),
        foodCost: Number(form.get("foodCost") ?? 0),
        description: String(form.get("description") ?? "") || null,
      });
      if (item) {
        onCreated(item);
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error("L'ajout du plat a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau plat" description="Prix et coût déterminent sa rentabilité.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom">
          <Input name="name" placeholder="Ex : Burger classique" required autoFocus />
        </Field>
        <Field label="Catégorie" hint="Optionnel">
          <Input name="category" placeholder="Ex : Plats principaux" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix de vente">
            <Input name="price" type="number" min="0" step="0.01" required />
          </Field>
          <Field label="Coût des ingrédients">
            <Input name="foodCost" type="number" min="0" step="0.01" required />
          </Field>
        </div>
        <Field label="Description" hint="Optionnel">
          <Input name="description" />
        </Field>
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

function SaleQuickAdd({
  restaurantId,
  item,
  onUpdated,
}: {
  restaurantId: string;
  item: MenuItem;
  onUpdated: (item: MenuItem) => void;
}) {
  const [qty, setQty] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    setIsSubmitting(true);
    try {
      const updated = await recordSaleAction(restaurantId, item.id, quantity);
      if (updated) {
        onUpdated(updated);
        setQty("1");
      } else {
        toast.error("L'enregistrement a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 border-t border-mv-border-soft pt-2">
      <input
        type="number"
        min="1"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="h-7 w-14 rounded-md border border-mv-border bg-mv-surface px-2 text-[12px]"
        aria-label="Quantité vendue"
      />
      <button
        onClick={handleAdd}
        disabled={isSubmitting}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-green-dark hover:bg-mv-green/10 disabled:opacity-50"
      >
        <TrendingUp size={12} /> ventes
      </button>
    </div>
  );
}

function EditMenuItemModal({
  restaurantId,
  item,
  open,
  onClose,
  onUpdated,
}: {
  restaurantId: string;
  item: MenuItem;
  open: boolean;
  onClose: () => void;
  onUpdated: (item: MenuItem) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const updated = await updateMenuItemAction(restaurantId, item.id, {
        name: String(form.get("name") ?? ""),
        category: String(form.get("category") ?? "") || null,
        price: Number(form.get("price") ?? 0),
        foodCost: Number(form.get("foodCost") ?? 0),
        description: String(form.get("description") ?? "") || null,
      });
      if (updated) {
        onUpdated(updated);
        onClose();
      } else {
        toast.error("La modification du plat a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Modifier le plat" description="Modifiez le prix, coût ou catégorie.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom">
          <Input name="name" defaultValue={item.name} placeholder="Ex : Burger classique" required autoFocus />
        </Field>
        <Field label="Catégorie" hint="Optionnel">
          <Input name="category" defaultValue={item.category ?? ""} placeholder="Ex : Plats principaux" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix de vente">
            <Input name="price" type="number" min="0" step="0.01" defaultValue={item.price} required />
          </Field>
          <Field label="Coût des ingrédients">
            <Input name="foodCost" type="number" min="0" step="0.01" defaultValue={item.foodCost} required />
          </Field>
        </div>
        <Field label="Description" hint="Optionnel">
          <Input name="description" defaultValue={item.description ?? ""} />
        </Field>
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

function MenuItemRow({
  item,
  restaurantId,
  canCreate,
  canManage,
  onUpdated,
  onDeleted,
  onEdit,
}: {
  item: MenuItemWithQuadrant;
  restaurantId: string;
  canCreate: boolean;
  canManage: boolean;
  onUpdated: (item: MenuItem) => void;
  onDeleted: (id: string) => void;
  onEdit: (item: MenuItem) => void;
}) {
  return (
    <div className="rounded-lg border border-mv-border-soft p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13.5px] font-semibold text-mv-ink">{item.name}</p>
          {item.category && <p className="text-[11.5px] text-mv-ink-faint">{item.category}</p>}
        </div>
        {canManage && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onEdit(item)}
              aria-label="Modifier le plat"
              className="text-mv-ink-faint transition-colors hover:text-mv-green-dark"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDeleted(item.id)}
              aria-label="Retirer le plat"
              className="text-mv-ink-faint transition-colors hover:text-mv-red"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
        <div>
          <p className="text-mv-ink-faint">Prix</p>
          <p className="font-medium text-mv-ink">{formatCurrency(item.price)}</p>
        </div>
        <div>
          <p className="text-mv-ink-faint">Marge</p>
          <p className="font-medium text-mv-ink">
            {item.marginPct != null ? `${Math.round(item.marginPct * 100)}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-mv-ink-faint">Ventes</p>
          <p className="font-medium text-mv-ink">{item.unitsSold}</p>
        </div>
      </div>
      {canCreate && <SaleQuickAdd restaurantId={restaurantId} item={item} onUpdated={onUpdated} />}
    </div>
  );
}

export function MenuView({
  restaurantId,
  initialItems,
}: {
  restaurantId: string | null;
  initialItems: MenuItem[];
}) {
  const { role } = useApp();
  const [items, setItems] = useState(initialItems);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const canManage = role === "owner" || role === "manager";
  const canCreate = Boolean(restaurantId) && (role === "owner" || role === "manager" || role === "staff");

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c)))),
    [items]
  );
  const filtered = useMemo(
    () => (categoryFilter === "all" ? items : items.filter((i) => i.category === categoryFilter)),
    [items, categoryFilter]
  );
  const classified = useMemo(() => classifyMenuItems(filtered), [filtered]);
  const byQuadrant = useMemo(() => {
    const map = new Map<MenuQuadrant, MenuItemWithQuadrant[]>();
    for (const q of quadrantOrder) map.set(q, []);
    for (const item of classified) map.get(item.quadrant)!.push(item);
    return map;
  }, [classified]);

  function handleUpdated(updated: MenuItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleDeleted(id: string) {
    if (!restaurantId) return;
    deleteMenuItemAction(restaurantId, id).then((ok) => {
      if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
      else toast.error("La suppression a échoué.");
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Menu"
        title="Ingénierie de menu"
        description="Rentabilité et popularité de chaque plat, classés en 4 catégories classiques."
        action={
          canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nouveau plat
            </Button>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Aucun plat"
          description="Ajoutez vos plats avec leur prix et leur coût pour voir leur rentabilité."
          action={
            canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Nouveau plat
              </Button>
            )
          }
        />
      ) : (
        <>
          {categories.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-200",
                  categoryFilter === "all"
                    ? "bg-mv-green text-mv-green-dark shadow-sm"
                    : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-ink/5"
                )}
              >
                Toutes les catégories
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-200",
                    categoryFilter === c
                      ? "bg-mv-green text-mv-green-dark shadow-sm"
                      : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-ink/5"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {quadrantOrder.map((q) => (
              <Card key={q}>
                <div className="mb-3 flex items-center gap-1.5">
                  <Badge tone={quadrantTone[q]}>{quadrantLabel[q]}</Badge>
                  <span title={quadrantDescription[q]}>
                    <Info size={13} className="text-mv-ink-faint" />
                  </span>
                </div>
                {byQuadrant.get(q)!.length === 0 ? (
                  <p className="text-[12px] text-mv-ink-faint">Aucun plat.</p>
                ) : (
                  <div className="space-y-2">
                    {byQuadrant.get(q)!.map((item) => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        restaurantId={restaurantId!}
                        canCreate={canCreate}
                        canManage={canManage}
                        onUpdated={handleUpdated}
                        onDeleted={handleDeleted}
                        onEdit={setEditingItem}
                      />
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {restaurantId && (
        <NewMenuItemModal
          restaurantId={restaurantId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(item) => setItems((prev) => [...prev, item])}
        />
      )}

      {restaurantId && editingItem && (
        <EditMenuItemModal
          restaurantId={restaurantId}
          item={editingItem}
          open={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

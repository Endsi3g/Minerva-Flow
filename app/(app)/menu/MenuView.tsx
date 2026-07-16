"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { HelperTooltip } from "@/components/ui/HelperTooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import {
  classifyMenuItems,
  quadrantLabel,
  quadrantDescription,
  type MenuItemWithQuadrant,
} from "@/lib/menu-engineering";
import type { MenuItem, MenuQuadrant, MenuShare } from "@/lib/types";
import { UtensilsCrossed, Plus, Trash2, TrendingUp, Pencil, Share2, Copy, Check } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  createMenuItemAction,
  deleteMenuItemAction,
  recordSaleAction,
  updateMenuItemAction,
  createMenuShareAction,
  deleteMenuShareAction,
  updateMenuSettingsAction,
} from "./actions";
import { notifyError } from "@/lib/notify-error";
import { MenuImageUpload } from "@/components/menu/MenuImageUpload";

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
  const [scopeId, setScopeId] = useState(() => crypto.randomUUID());
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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
        imageUrl,
      });
      if (item) {
        onCreated(item);
        onClose();
        (e.target as HTMLFormElement).reset();
        setImageUrl(null);
        setScopeId(crypto.randomUUID());
      } else {
        notifyError("L'ajout du plat a échoué.");
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
        <Field label="Image" hint="Optionnel — visible sur le menu public">
          <MenuImageUpload restaurantId={restaurantId} scopeId={scopeId} onUploaded={setImageUrl} />
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
        notifyError("L'enregistrement a échoué.");
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
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(undefined);

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
        imageUrl,
      });
      if (updated) {
        onUpdated(updated);
        onClose();
      } else {
        notifyError("La modification du plat a échoué.");
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
        <Field label="Image" hint="Optionnel — visible sur le menu public">
          <MenuImageUpload restaurantId={restaurantId} scopeId={item.id} currentUrl={item.imageUrl} onUploaded={setImageUrl} />
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
  onDeleted: (id: string, name: string) => void;
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
              onClick={() => onDeleted(item.id, item.name)}
              aria-label="Retirer le plat"
              className="text-mv-ink-faint transition-colors hover:text-mv-red"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3">
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

function ShareMenuModal({
  restaurantId,
  items,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  items: MenuItem[];
  open: boolean;
  onClose: () => void;
  onCreated: (share: MenuShare) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"full" | "selection">("full");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const share = await createMenuShareAction(restaurantId, {
        title: String(form.get("title") ?? "") || "Menu",
        itemIds: mode === "selection" ? Array.from(selected) : null,
      });
      if (share) {
        onCreated(share);
        onClose();
      } else {
        notifyError("La création du lien a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Partager le menu" description="Génère un lien public — vos clients peuvent commander directement.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Titre" hint="Affiché sur la page publique">
          <Input name="title" placeholder="Ex : Menu du soir" defaultValue="Menu" required autoFocus />
        </Field>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("full")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors",
              mode === "full" ? "border-mv-green bg-mv-green-tint text-mv-green-dark" : "border-mv-border text-mv-ink-soft"
            )}
          >
            Menu complet
          </button>
          <button
            type="button"
            onClick={() => setMode("selection")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors",
              mode === "selection" ? "border-mv-green bg-mv-green-tint text-mv-green-dark" : "border-mv-border text-mv-ink-soft"
            )}
          >
            Sélection de plats
          </button>
        </div>
        {mode === "selection" && (
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-mv-border-soft p-2">
            {items.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-mv-cream-soft">
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                {item.name}
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting || (mode === "selection" && selected.size === 0)}>
            {isSubmitting ? "Création…" : "Générer le lien"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ShareLinkRow({ share, onDeleted }: { share: MenuShare; onDeleted: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/m/${share.token}`;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-mv-border-soft px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-mv-ink">{share.title}</p>
        <p className="truncate text-[11.5px] text-mv-ink-faint">/m/{share.token}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button onClick={handleCopy} className="text-mv-ink-faint hover:text-mv-ink" aria-label="Copier le lien">
          {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
        </button>
        <button
          onClick={() => onDeleted(share.id)}
          className="text-mv-ink-faint hover:text-mv-red"
          aria-label="Supprimer le lien"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export function MenuView({
  restaurantId,
  initialItems,
  taxRate,
  acceptsTips,
  initialShares,
}: {
  restaurantId: string | null;
  initialItems: MenuItem[];
  taxRate: number;
  acceptsTips: boolean;
  initialShares: MenuShare[];
}) {
  const { role } = useApp();
  const [items, setItems] = useState(initialItems);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [shares, setShares] = useState(initialShares);
  const [shareOpen, setShareOpen] = useState(false);
  const [tax, setTax] = useState(taxRate);
  const [tips, setTips] = useState(acceptsTips);

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

  function handleDeleted(id: string, name: string) {
    if (!restaurantId) return;
    if (!window.confirm(`Retirer le plat "${name}" du menu ?`)) return;
    deleteMenuItemAction(restaurantId, id).then((ok) => {
      if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
      else notifyError("La suppression a échoué.");
    });
  }

  function handleShareDeleted(id: string) {
    if (!restaurantId) return;
    deleteMenuShareAction(restaurantId, id).then((ok) => {
      if (ok) setShares((prev) => prev.filter((s) => s.id !== id));
    });
  }

  async function handleTaxBlur() {
    if (!restaurantId || !canManage) return;
    await updateMenuSettingsAction(restaurantId, { taxRate: tax });
  }

  async function handleTipsToggle() {
    if (!restaurantId || !canManage) return;
    const next = !tips;
    setTips(next);
    await updateMenuSettingsAction(restaurantId, { acceptsTips: next });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Menu"
        title="Ingénierie de menu"
        description="Rentabilité et popularité de chaque plat, classés en 4 catégories classiques."
        action={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
                <Share2 size={14} /> Partager le menu
              </Button>
            )}
            {canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Nouveau plat
              </Button>
            )}
          </div>
        }
      />

      {canManage && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-mv-cream-soft px-4 py-3">
          <label className="flex items-center gap-1.5 text-[12.5px] text-mv-ink-soft" title="Taxes appliquées aux commandes en ligne">
            Taxes :
            <input
              type="number"
              min="0"
              max="1"
              step="0.00001"
              value={tax}
              onChange={(e) => setTax(Number(e.target.value))}
              onBlur={handleTaxBlur}
              className="h-8 w-24 rounded-md border border-mv-border bg-mv-surface px-2 text-[12.5px]"
            />
            ({Math.round(tax * 1000) / 10}%)
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px] text-mv-ink-soft">
            <input type="checkbox" checked={tips} onChange={handleTipsToggle} />
            Accepter le pourboire en ligne
          </label>
          {shares.length > 0 && (
            <div className="w-full space-y-1.5 border-t border-mv-border pt-3">
              {shares.map((s) => (
                <ShareLinkRow key={s.id} share={s} onDeleted={handleShareDeleted} />
              ))}
            </div>
          )}
        </div>
      )}

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
                  <HelperTooltip content={quadrantDescription[q]} />
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

      {restaurantId && (
        <ShareMenuModal
          restaurantId={restaurantId}
          items={items.filter((i) => i.active)}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          onCreated={(share) => setShares((prev) => [share, ...prev])}
        />
      )}
    </div>
  );
}

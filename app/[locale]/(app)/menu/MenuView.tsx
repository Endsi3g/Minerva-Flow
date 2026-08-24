"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/minerva/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { HelperTooltip } from "@/components/ui/HelperTooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import {
  classifyMenuItems,
  getMarginDriftItems,
  MARGIN_DRIFT_FOOD_COST_PCT,
  type MenuItemWithQuadrant,
} from "@/lib/menu-engineering";
import type { InventoryItem, MenuItem, MenuQuadrant, MenuShare, Offer, RecipeItem } from "@/lib/types";
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  TrendingUp,
  Pencil,
  Share2,
  Copy,
  Check,
  Download,
  Megaphone,
  EyeOff,
  ChefHat,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import {
  createMenuItemAction,
  deleteMenuItemAction,
  recordSaleAction,
  updateMenuItemAction,
  updateMenuItemRecipeAction,
  createMenuShareAction,
  deleteMenuShareAction,
  createOfferAction,
  updateOfferAction,
  deleteOfferAction,
  updateMenuSettingsAction,
} from "./actions";
import { notifyError } from "@/lib/notify-error";
import { MenuImageUpload } from "@/components/menu/MenuImageUpload";
import { toast } from "sonner";
import { createCampaignAction } from "@/app/[locale]/(app)/campaigns/actions";

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
  const t = useTranslations("menu.newItem");
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
        notifyError(t("createFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("modalTitle")} description={t("modalDescription")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t("nameLabel")}>
          <Input name="name" placeholder={t("namePlaceholder")} required autoFocus />
        </Field>
        <Field label={t("categoryLabel")} hint={t("optional")}>
          <Input name="category" placeholder={t("categoryPlaceholder")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("priceLabel")}>
            <Input name="price" type="number" min="0" step="0.01" required />
          </Field>
          <Field label={t("foodCostLabel")}>
            <Input name="foodCost" type="number" min="0" step="0.01" required />
          </Field>
        </div>
        <Field label={t("descriptionLabel")} hint={t("optional")}>
          <Input name="description" />
        </Field>
        <Field label={t("imageLabel")} hint={t("imageHint")}>
          <MenuImageUpload restaurantId={restaurantId} scopeId={scopeId} onUploaded={setImageUrl} />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("creating") : t("create")}
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
  const t = useTranslations("menu.saleQuickAdd");
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
        notifyError(t("recordFailed"));
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
        aria-label={t("quantityAria")}
      />
      <button
        onClick={handleAdd}
        disabled={isSubmitting}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-green-dark hover:bg-mv-green/10 disabled:opacity-50"
      >
        <TrendingUp size={12} /> {t("sales")}
      </button>
    </div>
  );
}

type RecipeRow = { inventoryItemId: string; quantityPerUnit: string };

/**
 * "Recette" editor — lets the owner declare which inventory items a dish
 * consumes per unit sold, so serving an order for it decrements those
 * items automatically (see applyServedOrderEffects in lib/data/orders.ts).
 * Optional: leaving it empty means this dish doesn't track inventory, same
 * as before this existed.
 */
function RecipeEditor({
  inventoryItems,
  rows,
  onChange,
}: {
  inventoryItems: InventoryItem[];
  rows: RecipeRow[];
  onChange: (rows: RecipeRow[]) => void;
}) {
  function updateRow(index: number, patch: Partial<RecipeRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  function addRow() {
    const used = new Set(rows.map((r) => r.inventoryItemId));
    const next = inventoryItems.find((i) => !used.has(i.id));
    onChange([...rows, { inventoryItemId: next?.id ?? "", quantityPerUnit: "" }]);
  }

  return (
    <div className="space-y-2 rounded-lg border border-mv-border-soft bg-mv-cream-soft/50 p-3">
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-mv-ink">
        <ChefHat size={14} className="text-mv-green-dark" />
        Recette (optionnel)
      </div>
      <p className="text-[11.5px] leading-snug text-mv-ink-faint">
        Ingrédients d&apos;inventaire consommés par unité vendue — une fois définis, servir une commande de ce
        plat retire automatiquement le stock correspondant.
      </p>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={row.inventoryItemId}
            onChange={(e) => updateRow(i, { inventoryItemId: e.target.value })}
            className="h-8 flex-1 rounded-md border border-mv-border bg-mv-surface px-2 text-[12.5px]"
          >
            <option value="" disabled>
              Choisir un article
            </option>
            {inventoryItems.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name} ({inv.unit})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Qté"
            value={row.quantityPerUnit}
            onChange={(e) => updateRow(i, { quantityPerUnit: e.target.value })}
            className="h-8 w-20 rounded-md border border-mv-border bg-mv-surface px-2 text-[12.5px]"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-mv-ink-faint hover:text-mv-red"
            aria-label="Retirer cet ingrédient"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        disabled={inventoryItems.length === 0 || rows.length >= inventoryItems.length}
        className="flex items-center gap-1 text-[12px] font-medium text-mv-green-dark hover:underline disabled:opacity-40"
      >
        <Plus size={12} /> Ajouter un ingrédient
      </button>
      {inventoryItems.length === 0 && (
        <p className="text-[11.5px] text-mv-ink-faint">Ajoutez d&apos;abord des articles dans Inventaire.</p>
      )}
    </div>
  );
}

function EditMenuItemModal({
  restaurantId,
  item,
  inventoryItems,
  initialRecipe,
  open,
  onClose,
  onUpdated,
}: {
  restaurantId: string;
  item: MenuItem;
  inventoryItems: InventoryItem[];
  initialRecipe: RecipeItem[];
  open: boolean;
  onClose: () => void;
  onUpdated: (item: MenuItem) => void;
}) {
  const t = useTranslations("menu.editItem");
  const tn = useTranslations("menu.newItem");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(undefined);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>(() =>
    initialRecipe.map((r) => ({ inventoryItemId: r.inventoryItemId, quantityPerUnit: String(r.quantityPerUnit) }))
  );

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
        await updateMenuItemRecipeAction(
          restaurantId,
          item.id,
          recipeRows
            .filter((r) => r.inventoryItemId && Number(r.quantityPerUnit) > 0)
            .map((r) => ({ inventoryItemId: r.inventoryItemId, quantityPerUnit: Number(r.quantityPerUnit) }))
        );
        onUpdated(updated);
        onClose();
      } else {
        notifyError(t("updateFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("modalTitle")} description={t("modalDescription")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={tn("nameLabel")}>
          <Input name="name" defaultValue={item.name} placeholder={tn("namePlaceholder")} required autoFocus />
        </Field>
        <Field label={tn("categoryLabel")} hint={tn("optional")}>
          <Input name="category" defaultValue={item.category ?? ""} placeholder={tn("categoryPlaceholder")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tn("priceLabel")}>
            <Input name="price" type="number" min="0" step="0.01" defaultValue={item.price} required />
          </Field>
          <Field label={tn("foodCostLabel")}>
            <Input name="foodCost" type="number" min="0" step="0.01" defaultValue={item.foodCost} required />
          </Field>
        </div>
        <Field label={tn("descriptionLabel")} hint={tn("optional")}>
          <Input name="description" defaultValue={item.description ?? ""} />
        </Field>
        <Field label={tn("imageLabel")} hint={tn("imageHint")}>
          <MenuImageUpload restaurantId={restaurantId} scopeId={item.id} currentUrl={item.imageUrl} onUploaded={setImageUrl} />
        </Field>
        <RecipeEditor inventoryItems={inventoryItems} rows={recipeRows} onChange={setRecipeRows} />
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {tn("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("saving") : t("save")}
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
  const t = useTranslations("menu.itemRow");
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggleActive() {
    setIsToggling(true);
    try {
      const updated = await updateMenuItemAction(restaurantId, item.id, { active: !item.active });
      if (updated) onUpdated(updated);
      else notifyError("La mise à jour a échoué.");
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <div className="rounded-lg border border-mv-border-soft p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-mv-ink">
            {item.name}
            {!item.active && <Badge tone="neutral">Retiré du menu</Badge>}
          </p>
          {item.category && <p className="text-[11.5px] text-mv-ink-faint">{item.category}</p>}
        </div>
        {canManage && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleActive}
              disabled={isToggling}
              aria-label={item.active ? "Retirer du menu" : "Remettre au menu"}
              title={item.active ? "Retirer du menu" : "Remettre au menu"}
              className="text-mv-ink-faint transition-colors hover:text-mv-amber disabled:opacity-50"
            >
              <EyeOff size={13} />
            </button>
            <button
              onClick={() => onEdit(item)}
              aria-label={t("editAria")}
              className="text-mv-ink-faint transition-colors hover:text-mv-green-dark"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDeleted(item.id, item.name)}
              aria-label={t("removeAria")}
              className="text-mv-ink-faint transition-colors hover:text-mv-red"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3">
        <div>
          <p className="text-mv-ink-faint">{t("price")}</p>
          <p className="font-medium text-mv-ink">{formatCurrency(item.price)}</p>
        </div>
        <div>
          <p className="text-mv-ink-faint">{t("margin")}</p>
          <p className="font-medium text-mv-ink">
            {item.marginPct != null ? `${Math.round(item.marginPct * 100)}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-mv-ink-faint">{t("sales")}</p>
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
  const t = useTranslations("menu.shareMenu");
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
        notifyError(t("createFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("modalTitle")} description={t("modalDescription")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t("titleLabel")} hint={t("titleHint")}>
          <Input name="title" placeholder={t("titlePlaceholder")} defaultValue="Menu" required autoFocus />
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
            {t("fullMenu")}
          </button>
          <button
            type="button"
            onClick={() => setMode("selection")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors",
              mode === "selection" ? "border-mv-green bg-mv-green-tint text-mv-green-dark" : "border-mv-border text-mv-ink-soft"
            )}
          >
            {t("itemSelection")}
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
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting || (mode === "selection" && selected.size === 0)}>
            {isSubmitting ? t("creating") : t("generateLink")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ShareLinkRow({ share, onDeleted }: { share: MenuShare; onDeleted: (id: string) => void }) {
  const t = useTranslations("menu.shareLink");
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://minerva-flow.vercel.app"}/m/${share.token}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [url]);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${share.title.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-mv-border-soft px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="" className="h-9 w-9 shrink-0 rounded border border-mv-border-soft" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-mv-ink">{share.title}</p>
          <p className="truncate text-[11.5px] text-mv-ink-faint">/m/{share.token}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="text-mv-ink-faint hover:text-mv-ink disabled:opacity-40"
          aria-label={t("downloadQrAria")}
        >
          <Download size={14} />
        </button>
        <button onClick={handleCopy} className="text-mv-ink-faint hover:text-mv-ink" aria-label={t("copyLinkAria")}>
          {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
        </button>
        <button
          onClick={() => onDeleted(share.id)}
          className="text-mv-ink-faint hover:text-mv-red"
          aria-label={t("deleteLinkAria")}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/** datetime-local inputs work in local time with no timezone — round-trip through ISO for storage. */
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function OfferModal({
  restaurantId,
  open,
  offer,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  open: boolean;
  offer?: Offer | null;
  onClose: () => void;
  onSaved: (offer: Offer) => void;
}) {
  const t = useTranslations("menu.offer");
  const tn = useTranslations("menu.newItem");
  const isEditing = Boolean(offer);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scopeId, setScopeId] = useState(() => offer?.id ?? crypto.randomUUID());
  const [imageUrl, setImageUrl] = useState<string | null>(offer?.imageUrl ?? null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? "") || null,
      imageUrl,
      startsAt: fromDatetimeLocal(String(form.get("startsAt") ?? "")),
      endsAt: fromDatetimeLocal(String(form.get("endsAt") ?? "")),
    };
    setIsSubmitting(true);
    try {
      const saved = offer
        ? await updateOfferAction(restaurantId, offer.id, input)
        : await createOfferAction(restaurantId, input);
      if (saved) {
        onSaved(saved);
        onClose();
        (e.target as HTMLFormElement).reset();
        setImageUrl(null);
        setScopeId(crypto.randomUUID());
      } else {
        notifyError(isEditing ? t("updateFailed") : t("createFailed"));
      }
    } catch {
      notifyError(isEditing ? t("updateFailed") : t("createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t("modalTitleEdit") : t("modalTitleNew")}
      description={t("modalDescription")}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t("titleLabel")}>
          <Input name="title" defaultValue={offer?.title} placeholder={t("titlePlaceholder")} required autoFocus />
        </Field>
        <Field label={tn("descriptionLabel")} hint={tn("optional")}>
          <Input name="description" defaultValue={offer?.description ?? undefined} placeholder={t("descriptionPlaceholder")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("startsLabel")} hint={tn("optional")}>
            <Input name="startsAt" type="datetime-local" defaultValue={toDatetimeLocal(offer?.startsAt)} />
          </Field>
          <Field label={t("endsLabel")} hint={tn("optional")}>
            <Input name="endsAt" type="datetime-local" defaultValue={toDatetimeLocal(offer?.endsAt)} />
          </Field>
        </div>
        <Field label={tn("imageLabel")} hint={tn("imageHint")}>
          <MenuImageUpload restaurantId={restaurantId} scopeId={scopeId} currentUrl={imageUrl} bucket="offer-images" onUploaded={setImageUrl} />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {tn("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("saving") : isEditing ? t("save") : t("publish")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type OfferStatus = "scheduled" | "active" | "expired" | "hidden";

function getOfferStatus(offer: Offer): { status: OfferStatus; tone: "green" | "amber" | "neutral" } {
  if (!offer.active) return { status: "hidden", tone: "neutral" };
  const now = Date.now();
  if (offer.startsAt && new Date(offer.startsAt).getTime() > now) {
    return { status: "scheduled", tone: "amber" };
  }
  if (offer.endsAt && new Date(offer.endsAt).getTime() < now) {
    return { status: "expired", tone: "neutral" };
  }
  return { status: "active", tone: "green" };
}

function OfferRow({
  restaurantId,
  offer,
  onUpdated,
  onDeleted,
  onEdit,
}: {
  restaurantId: string;
  offer: Offer;
  onUpdated: (offer: Offer) => void;
  onDeleted: (id: string) => void;
  onEdit: (offer: Offer) => void;
}) {
  const t = useTranslations("menu.offerRow");
  const tStatus = useTranslations("menu.offerStatus");
  const [pending, setPending] = useState(false);
  // Forces a re-render once a minute so a scheduled/expired offer's badge
  // flips at its startsAt/endsAt boundary without waiting on an unrelated
  // state change to trigger it.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const { status, tone } = getOfferStatus(offer);

  async function handleToggleActive() {
    setPending(true);
    try {
      const updated = await updateOfferAction(restaurantId, offer.id, { active: !offer.active });
      if (updated) onUpdated(updated);
      else notifyError(t("updateFailed"));
    } catch {
      notifyError(t("updateFailed"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t("confirmDelete", { title: offer.title }))) return;
    setPending(true);
    try {
      const ok = await deleteOfferAction(restaurantId, offer.id);
      if (ok) onDeleted(offer.id);
      else notifyError(t("deleteFailed"));
    } catch {
      notifyError(t("deleteFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-mv-border-soft px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {offer.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={offer.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-mv-ink">{offer.title}</p>
          {offer.description && <p className="truncate text-[11.5px] text-mv-ink-faint">{offer.description}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={tone} dot>
          {tStatus(status)}
        </Badge>
        <button
          onClick={() => onEdit(offer)}
          className="text-mv-ink-faint hover:text-mv-ink"
          aria-label={t("editAria")}
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={handleToggleActive}
          disabled={pending}
          className="text-mv-ink-faint hover:text-mv-ink disabled:opacity-50"
          aria-label={offer.active ? t("hideAria") : t("showAria")}
        >
          <EyeOff size={14} />
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-mv-ink-faint hover:text-mv-red disabled:opacity-50"
          aria-label={t("deleteAria")}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function MarginDriftPanel({
  items,
  restaurantId,
  canManage,
  onUpdated,
}: {
  items: MenuItemWithQuadrant[];
  restaurantId: string | null;
  canManage: boolean;
  onUpdated: (item: MenuItem) => void;
}) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  if (items.length === 0) return null;

  async function handleDisable(itemId: string) {
    if (!restaurantId) return;
    setTogglingId(itemId);
    try {
      const updated = await updateMenuItemAction(restaurantId, itemId, { active: false });
      if (updated) onUpdated(updated);
      else notifyError("La mise à jour a échoué.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <AlertBanner
      tone="warning"
      title={
        <span className="flex items-center gap-1.5">
          Dérive de marge
          <HelperTooltip
            content={`Plats dont le coût matière dépasse ${Math.round(MARGIN_DRIFT_FOOD_COST_PCT * 100)}% du prix de vente — la marge de ces plats s'est dégradée, sans qu'il soit question d'en changer le prix.`}
          />
        </span>
      }
      className="mb-6"
    >
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <span className="font-medium text-mv-ink">{item.name}</span>
            <div className="flex items-center gap-2.5">
              <span className="text-mv-ink-faint">
                coût matière {formatCurrency(item.foodCost)} ({Math.round((item.foodCostPct ?? 0) * 100)}% du prix{" "}
                {formatCurrency(item.price)})
              </span>
              {canManage && (
                <button
                  onClick={() => handleDisable(item.id)}
                  disabled={togglingId === item.id}
                  className="shrink-0 whitespace-nowrap rounded-md border border-mv-amber/30 px-2 py-1 text-[11.5px] font-semibold text-mv-amber transition-colors hover:bg-mv-amber-bg disabled:opacity-50"
                >
                  {togglingId === item.id ? "…" : "Retirer du menu"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AlertBanner>
  );
}

type MenuInsightIdea = { title: string; action: string };

function MenuAiInsightsPanel({ restaurantId }: { restaurantId: string | null }) {
  const [ideas, setIdeas] = useState<MenuInsightIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [launchedIndexes, setLaunchedIndexes] = useState<Set<number>>(new Set());
  const [launchingIndex, setLaunchingIndex] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/menu-insights", { method: "POST" });
      const data = await res.json();
      setIdeas(data.ideas ?? []);
      setLaunchedIndexes(new Set());
      if (data.message) setMessage(data.message);
    } catch {
      setMessage("La génération IA a échoué — réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLaunch(idea: MenuInsightIdea, index: number) {
    if (!restaurantId) return;
    setLaunchingIndex(index);
    try {
      const today = new Date();
      const inThirtyDays = new Date(Date.now() + 30 * 86_400_000);
      const campaign = await createCampaignAction(restaurantId, {
        name: idea.title,
        description: idea.action,
        channel: "Email",
        type: "email",
        status: "planifiee",
        startDate: today.toISOString().slice(0, 10),
        endDate: inThirtyDays.toISOString().slice(0, 10),
      });
      if (campaign) {
        setLaunchedIndexes((prev) => new Set(prev).add(index));
        toast.success("Campagne créée — à retrouver et ajuster dans Campagnes.");
      } else {
        notifyError("La création de la campagne a échoué.");
      }
    } finally {
      setLaunchingIndex(null);
    }
  }

  return (
    <div className="mb-6 rounded-xl bg-mv-cream-soft px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink">
          <Sparkles size={14} className="text-mv-green-dark" /> Idées de campagnes Flow AI
        </p>
        <Button size="sm" variant="secondary" onClick={generate} disabled={loading}>
          <Sparkles size={14} /> {loading ? "Analyse…" : "Générer des idées"}
        </Button>
      </div>
      {ideas === null ? (
        <p className="text-[12px] text-mv-ink-faint">
          Analyse la rentabilité de vos plats et vos clients inactifs pour suggérer des campagnes de fidélisation —
          jamais un changement de prix.
        </p>
      ) : ideas.length === 0 ? (
        <p className="text-[12px] text-mv-ink-faint">{message ?? "Rien à suggérer pour l'instant."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ideas.map((idea, i) => (
            <div key={i} className="rounded-xl border border-mv-border-soft bg-mv-surface p-3.5">
              <div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-mv-lime-tint text-mv-lime-dark">
                <Lightbulb size={12} />
              </div>
              <p className="text-[13px] font-semibold leading-snug text-mv-ink">{idea.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-mv-ink-soft">{idea.action}</p>
              {launchedIndexes.has(i) ? (
                <p className="mv-check-pop mt-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-mv-green-dark">
                  <Check size={13} /> Campagne créée
                </p>
              ) : (
                <button
                  onClick={() => handleLaunch(idea, i)}
                  disabled={launchingIndex === i}
                  className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-mv-green-dark hover:underline disabled:opacity-50"
                >
                  <Megaphone size={13} /> {launchingIndex === i ? "Création…" : "Lancer cette campagne"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuView({
  restaurantId,
  initialItems,
  taxRate,
  acceptsTips,
  initialShares,
  initialOffers,
  inventoryItems = [],
  initialRecipes = {},
}: {
  restaurantId: string | null;
  initialItems: MenuItem[];
  taxRate: number;
  acceptsTips: boolean;
  initialShares: MenuShare[];
  initialOffers: Offer[];
  inventoryItems?: InventoryItem[];
  initialRecipes?: Record<string, RecipeItem[]>;
}) {
  const t = useTranslations("menu.page");
  const tq = useTranslations("menu.quadrant");
  const { role } = useApp();
  const [items, setItems] = useState(initialItems);
  const [recipesByMenuItem] = useState(initialRecipes);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [shares, setShares] = useState(initialShares);
  const [shareOpen, setShareOpen] = useState(false);
  const [offers, setOffers] = useState(initialOffers);
  const [offerOpen, setOfferOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
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
  const marginDriftItems = useMemo(() => getMarginDriftItems(classified), [classified]);
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
    if (!window.confirm(t("confirmDeleteItem", { name }))) return;
    deleteMenuItemAction(restaurantId, id).then((ok) => {
      if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
      else notifyError(t("deleteFailed"));
    });
  }

  function handleShareDeleted(id: string) {
    if (!restaurantId) return;
    deleteMenuShareAction(restaurantId, id).then((ok) => {
      if (ok) setShares((prev) => prev.filter((s) => s.id !== id));
    });
  }

  function handleOfferUpdated(updated: Offer) {
    setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  function handleOfferDeleted(id: string) {
    setOffers((prev) => prev.filter((o) => o.id !== id));
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
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
                <Share2 size={14} /> {t("shareMenu")}
              </Button>
            )}
            {canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> {t("newItem")}
              </Button>
            )}
          </div>
        }
      />

      {canManage && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-mv-cream-soft px-4 py-3">
          <label className="flex items-center gap-1.5 text-[12.5px] text-mv-ink-soft" title={t("taxesTooltip")}>
            {t("taxesLabel")}
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
            {t("acceptTipsOnline")}
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

      {canManage && restaurantId && (
        <div className="mb-6 rounded-xl bg-mv-cream-soft px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink">
              <Megaphone size={14} className="text-mv-green-dark" /> {t("offersTitle")}
            </p>
            <Button size="sm" variant="secondary" onClick={() => setOfferOpen(true)}>
              <Plus size={14} /> {t("newOffer")}
            </Button>
          </div>
          {offers.length === 0 ? (
            <p className="text-[12px] text-mv-ink-faint">
              {t("offersEmptyDescription")}
            </p>
          ) : (
            <div className="space-y-1.5">
              {offers.map((offer) => (
                <OfferRow
                  key={offer.id}
                  restaurantId={restaurantId}
                  offer={offer}
                  onUpdated={handleOfferUpdated}
                  onDeleted={handleOfferDeleted}
                  onEdit={setEditingOffer}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {canManage && restaurantId && (
        <MarginDriftPanel
          items={marginDriftItems}
          restaurantId={restaurantId}
          canManage={canManage}
          onUpdated={handleUpdated}
        />
      )}

      {canManage && restaurantId && <MenuAiInsightsPanel restaurantId={restaurantId} />}

      {items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> {t("newItem")}
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
                    ? "bg-mv-green text-mv-cream-soft shadow-sm"
                    : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-ink/5"
                )}
              >
                {t("allCategories")}
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-200",
                    categoryFilter === c
                      ? "bg-mv-green text-mv-cream-soft shadow-sm"
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
                  <Badge tone={quadrantTone[q]}>{tq(`label.${q}`)}</Badge>
                  <HelperTooltip content={tq(`description.${q}`)} />
                </div>
                {byQuadrant.get(q)!.length === 0 ? (
                  <p className="text-[12px] text-mv-ink-faint">{t("noItemInQuadrant")}</p>
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
          inventoryItems={inventoryItems}
          initialRecipe={recipesByMenuItem[editingItem.id] ?? []}
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

      {restaurantId && (
        <OfferModal
          key={editingOffer?.id ?? "new"}
          restaurantId={restaurantId}
          open={offerOpen || Boolean(editingOffer)}
          offer={editingOffer}
          onClose={() => {
            setOfferOpen(false);
            setEditingOffer(null);
          }}
          onSaved={(offer) => {
            if (editingOffer) handleOfferUpdated(offer);
            else setOffers((prev) => [offer, ...prev]);
          }}
        />
      )}
    </div>
  );
}

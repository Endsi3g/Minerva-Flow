"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { MenuImageUpload } from "@/components/menu/MenuImageUpload";
import { formatCurrency } from "@/lib/utils";
import { notifyError } from "@/lib/notify-error";
import { useApp } from "@/lib/app-context";
import { updateMenuItemAction, deleteMenuItemAction } from "@/app/[locale]/(app)/menu/actions";
import type { MenuItem, InventoryItem, RecipeItem } from "@/lib/types";
import { ArrowLeft, ArrowRight, ChefHat, EyeOff, Eye, Trash2, DollarSign, TrendingUp, ShoppingBag } from "lucide-react";

export function MenuItemDetailView({
  restaurantId,
  item: initialItem,
  previousId,
  nextId,
  inventoryItems,
  recipeItems,
}: {
  restaurantId: string;
  item: MenuItem;
  previousId: string | null;
  nextId: string | null;
  inventoryItems: InventoryItem[];
  recipeItems: RecipeItem[];
}) {
  const router = useRouter();
  const { role } = useApp();
  const canManage = role === "owner" || role === "manager";

  const [item, setItem] = useState(initialItem);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const marginPct = item.price > 0 ? (item.price - item.foodCost) / item.price : 0;
  const inventoryById = new Map(inventoryItems.map((i) => [i.id, i]));

  async function handleImageUploaded(url: string) {
    const updated = await updateMenuItemAction(restaurantId, item.id, { imageUrl: url });
    if (updated) {
      setItem(updated);
      toast.success("Image mise à jour.");
    } else {
      notifyError("La mise à jour de l'image a échoué.");
    }
  }

  async function handleToggleActive() {
    setToggling(true);
    try {
      const updated = await updateMenuItemAction(restaurantId, item.id, { active: !item.active });
      if (updated) setItem(updated);
      else notifyError("La mise à jour a échoué.");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Retirer définitivement "${item.name}" du menu ?`)) return;
    setDeleting(true);
    const ok = await deleteMenuItemAction(restaurantId, item.id);
    if (ok) router.push("/menu");
    else {
      setDeleting(false);
      notifyError("La suppression a échoué.");
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/menu")}
        className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={14} /> Tout le menu
      </button>

      <PageHeader
        eyebrow={item.category ?? "Menu"}
        title={item.name}
        description={item.active ? undefined : "Ce plat est actuellement retiré du menu."}
        action={
          canManage && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                title={item.active ? "Retirer du menu" : "Remettre au menu"}
                className="rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-amber-bg hover:text-mv-amber disabled:opacity-50"
              >
                {item.active ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Supprimer"
                className="rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-red/10 hover:text-mv-red disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )
        }
      />

      {!item.active && (
        <div className="mb-4">
          <Badge tone="neutral">Retiré du menu</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Card>
            {canManage ? (
              <MenuImageUpload restaurantId={restaurantId} scopeId={item.id} currentUrl={item.imageUrl} onUploaded={handleImageUploaded} />
            ) : item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.name} className="h-64 w-full rounded-lg object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg bg-mv-cream-soft text-mv-ink-faint">
                <ChefHat size={28} />
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-mv-cream-soft p-3">
              <div>
                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-mv-ink-faint">
                  <DollarSign size={11} /> Prix
                </p>
                <p className="font-display text-[16px] font-medium text-mv-ink">{formatCurrency(item.price)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-mv-ink-faint">
                  <TrendingUp size={11} /> Marge
                </p>
                <p className="font-display text-[16px] font-medium text-mv-ink">{Math.round(marginPct * 100)}%</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase text-mv-ink-faint">
                  <ShoppingBag size={11} /> Vendus
                </p>
                <p className="font-display text-[16px] font-medium text-mv-ink">{item.unitsSold}</p>
              </div>
            </div>

            {item.description && (
              <p className="mt-4 text-[13.5px] leading-relaxed text-mv-ink-soft">{item.description}</p>
            )}
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card>
            <CardHeader
              eyebrow="Recette"
              title="Ingrédients"
              description={recipeItems.length === 0 ? undefined : "Ce que ce plat consomme de l'inventaire à chaque vente."}
            />
            {recipeItems.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">
                Aucun ingrédient lié — ce plat ne fait pas encore bouger l&apos;inventaire quand il est vendu.
              </p>
            ) : (
              <div className="space-y-1.5">
                {recipeItems.map((r) => {
                  const ingredient = inventoryById.get(r.inventoryItemId);
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2 text-[13px]">
                      <span className="text-mv-ink">{ingredient?.name ?? "Ingrédient introuvable"}</span>
                      <span className="text-mv-ink-faint">
                        {r.quantityPerUnit} {ingredient?.unit ?? ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {(previousId || nextId) && (
        <div className="fixed bottom-20 right-5 z-30 flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface p-1 shadow-mv-lg">
          <button
            disabled={!previousId}
            onClick={() => previousId && router.push(`/menu/${previousId}`)}
            aria-label="Plat précédent"
            title="Plat précédent"
            className="flex h-9 w-9 items-center justify-center rounded-full text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:opacity-30"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            disabled={!nextId}
            onClick={() => nextId && router.push(`/menu/${nextId}`)}
            aria-label="Plat suivant"
            title="Plat suivant"
            className="flex h-9 w-9 items-center justify-center rounded-full text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:opacity-30"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

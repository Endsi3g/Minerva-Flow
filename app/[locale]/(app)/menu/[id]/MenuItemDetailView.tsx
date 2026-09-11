"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MenuImageUpload } from "@/components/menu/MenuImageUpload";
import { VideoUploadWithUrl } from "@/components/media/VideoUploadWithUrl";
import { VideoPlayerModal } from "@/components/media/VideoPlayerModal";
import { formatCurrency } from "@/lib/utils";
import { notifyError } from "@/lib/notify-error";
import { useApp } from "@/lib/app-context";
import { usePresenceDetail } from "@/lib/presence/context";
import {
  updateMenuItemAction,
  deleteMenuItemAction,
  updateMenuItemRecipeAction,
} from "@/app/[locale]/(app)/menu/actions";
import { calculateMenuItemStockStatus } from "@/lib/data/menu";
import type { MenuItem, InventoryItem, RecipeItem } from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  ChefHat,
  EyeOff,
  Eye,
  Trash2,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Play,
  Plus,
  Edit3,
} from "lucide-react";

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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Recipe editing state
  const [recipes, setRecipes] = useState<RecipeItem[]>(recipeItems);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [recipeDraft, setRecipeDraft] = useState<{ inventoryItemId: string; quantityPerUnit: number }[]>(
    recipeItems.map((r) => ({ inventoryItemId: r.inventoryItemId, quantityPerUnit: r.quantityPerUnit }))
  );
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  usePresenceDetail(`Plat : ${item.name}`);

  const inventoryById = useMemo(() => new Map(inventoryItems.map((i) => [i.id, i])), [inventoryItems]);

  const stockStatus = useMemo(
    () => calculateMenuItemStockStatus(recipes, inventoryById),
    [recipes, inventoryById]
  );

  const activeRecipeList = useMemo(() => {
    return isEditingRecipe
      ? recipeDraft
      : recipes.map((r) => ({ inventoryItemId: r.inventoryItemId, quantityPerUnit: r.quantityPerUnit }));
  }, [isEditingRecipe, recipeDraft, recipes]);

  const theoreticalFoodCost = useMemo(() => {
    return activeRecipeList.reduce((sum, r) => {
      const ing = inventoryById.get(r.inventoryItemId);
      return sum + (ing?.unitCost ?? 0) * (r.quantityPerUnit || 0);
    }, 0);
  }, [activeRecipeList, inventoryById]);

  const theoreticalMargin = Math.max(0, item.price - theoreticalFoodCost);
  const theoreticalMarginPct = item.price > 0 ? (theoreticalMargin / item.price) * 100 : 0;
  const theoreticalCostPct = item.price > 0 ? (theoreticalFoodCost / item.price) * 100 : 0;

  function startEditingRecipe() {
    setRecipeDraft(
      recipes.length > 0
        ? recipes.map((r) => ({ inventoryItemId: r.inventoryItemId, quantityPerUnit: r.quantityPerUnit }))
        : inventoryItems.length > 0
        ? [{ inventoryItemId: inventoryItems[0].id, quantityPerUnit: 1 }]
        : []
    );
    setIsEditingRecipe(true);
  }

  function handleAddIngredientRow() {
    if (inventoryItems.length === 0) return;
    setRecipeDraft((prev) => [...prev, { inventoryItemId: inventoryItems[0].id, quantityPerUnit: 1 }]);
  }

  function handleUpdateDraftRow(index: number, patch: Partial<{ inventoryItemId: string; quantityPerUnit: number }>) {
    setRecipeDraft((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleRemoveDraftRow(index: number) {
    setRecipeDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveRecipe() {
    setIsSavingRecipe(true);
    try {
      const validItems = recipeDraft.filter(
        (r) => r.inventoryItemId && r.quantityPerUnit > 0
      );
      const res = await updateMenuItemRecipeAction(restaurantId, item.id, validItems);
      if (res.ok) {
        setRecipes(res.recipeItems);
        if (res.updatedItem) {
          setItem(res.updatedItem);
        } else {
          setItem((prev) => ({ ...prev, foodCost: res.foodCost }));
        }
        setIsEditingRecipe(false);
        toast.success("Recette enregistrée et Food Cost mis à jour !");
      } else {
        notifyError("L'enregistrement de la recette a échoué.");
      }
    } finally {
      setIsSavingRecipe(false);
    }
  }

  const marginPct = item.price > 0 ? (item.price - item.foodCost) / item.price : 0;

  async function handleImageUploaded(url: string) {
    const updated = await updateMenuItemAction(restaurantId, item.id, { imageUrl: url });
    if (updated) {
      setItem(updated);
      toast.success("Image mise à jour.");
    } else {
      notifyError("La mise à jour de l'image a échoué.");
    }
  }

  async function handleVideoChanged(url: string | null) {
    const updated = await updateMenuItemAction(restaurantId, item.id, { videoUrl: url });
    if (updated) {
      setItem(updated);
      toast.success(url ? "Vidéo associée au plat !" : "Vidéo retirée.");
    } else {
      notifyError("La mise à jour de la vidéo a échoué.");
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {!item.active && <Badge tone="neutral">Retiré du menu</Badge>}
        {stockStatus.status === "rupture" && (
          <Badge tone="red">
            Rupture de stock (0 portion disponible)
          </Badge>
        )}
        {stockStatus.status === "critique" && (
          <Badge tone="amber">
            Stock critique ({stockStatus.portionsAvailable} portions restantes)
          </Badge>
        )}
        {stockStatus.status === "ok" && (
          <Badge tone="green">
            Stock disponible ({stockStatus.portionsAvailable} portions)
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Card className="space-y-4">
            <div className="relative">
              {canManage ? (
                <MenuImageUpload restaurantId={restaurantId} scopeId={item.id} currentUrl={item.imageUrl} onUploaded={handleImageUploaded} />
              ) : item.imageUrl ? (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.name} className="h-64 w-full rounded-lg object-cover" />
                  {item.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setIsVideoModalOpen(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-2xs opacity-90 group-hover:opacity-100 transition-opacity rounded-lg"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mv-green text-white shadow-lg">
                        <Play size={20} className="fill-current ml-0.5" />
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg bg-mv-cream-soft text-mv-ink-faint">
                  <ChefHat size={28} />
                </div>
              )}
            </div>

            {canManage && (
              <VideoUploadWithUrl
                restaurantId={restaurantId}
                scopeId={item.id}
                currentUrl={item.videoUrl}
                onVideoChanged={handleVideoChanged}
                title={`Vidéo · ${item.name}`}
              />
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
            <div className="flex items-start justify-between gap-2 border-b border-mv-border-soft pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Fiche technique</p>
                <h3 className="font-display text-[16px] font-semibold text-mv-ink">Recette & Coût matière</h3>
                <p className="text-[12px] text-mv-ink-soft">
                  {isEditingRecipe
                    ? "Composez les ingrédients consommés par portion pour recalculer automatiquement le Food Cost."
                    : "Ingrédients déduits de l'inventaire lors de chaque vente de ce plat."}
                </p>
              </div>
              {canManage && !isEditingRecipe && (
                <Button size="sm" variant="outline" onClick={startEditingRecipe} className="shrink-0 text-[12px]">
                  <Edit3 size={13} /> {recipes.length === 0 ? "Créer la recette" : "Modifier"}
                </Button>
              )}
            </div>

            {isEditingRecipe ? (
              <div className="mt-4 space-y-3">
                {inventoryItems.length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">
                    Aucun ingrédient dans l&apos;inventaire. Ajoutez d&apos;abord des articles dans{" "}
                    <a href="/inventaire" className="font-medium text-mv-green hover:underline">
                      Inventaire
                    </a>
                    .
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {recipeDraft.map((row, index) => {
                        const selectedIng = inventoryById.get(row.inventoryItemId);
                        const lineCost = (selectedIng?.unitCost ?? 0) * (row.quantityPerUnit || 0);
                        return (
                          <div
                            key={index}
                            className="flex flex-col gap-1.5 rounded-lg border border-mv-border-soft bg-mv-surface p-2.5 sm:flex-row sm:items-center"
                          >
                            <select
                              value={row.inventoryItemId}
                              onChange={(e) => handleUpdateDraftRow(index, { inventoryItemId: e.target.value })}
                              className="h-8 flex-1 rounded-md border border-mv-border bg-mv-cream-soft px-2 text-[12.5px] text-mv-ink focus:border-mv-green focus:outline-none"
                            >
                              {inventoryItems.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({formatCurrency(ing.unitCost)} / {ing.unit})
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={row.quantityPerUnit}
                                onChange={(e) =>
                                  handleUpdateDraftRow(index, { quantityPerUnit: parseFloat(e.target.value) || 0 })
                                }
                                placeholder="Qté"
                                className="h-8 w-20 rounded-md border border-mv-border bg-mv-cream-soft px-2 text-right font-mono text-[12.5px] text-mv-ink focus:border-mv-green focus:outline-none"
                                aria-label="Quantité consommée par portion"
                              />
                              <span className="w-12 text-[11.5px] text-mv-ink-faint">{selectedIng?.unit ?? ""}</span>
                              <span className="w-16 text-right font-mono text-[12px] font-medium text-mv-ink">
                                {formatCurrency(lineCost)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDraftRow(index)}
                                className="rounded p-1 text-mv-ink-faint transition hover:bg-mv-red/10 hover:text-mv-red"
                                title="Retirer l'ingrédient"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddIngredientRow}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-mv-green hover:text-mv-green-dark"
                    >
                      <Plus size={13} /> Ajouter un ingrédient
                    </button>

                    {/* Live Food Cost & Margin Preview */}
                    <div className="mt-4 rounded-xl border border-mv-border bg-mv-cream-soft p-3">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-mv-ink-soft">Food Cost calculé :</span>
                        <span className="font-mono font-semibold text-mv-ink">
                          {formatCurrency(theoreticalFoodCost)} ({theoreticalCostPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[12.5px]">
                        <span className="text-mv-ink-soft">Marge brute estimée :</span>
                        <span className="font-mono font-semibold text-mv-green-dark">
                          {formatCurrency(theoreticalMargin)} ({theoreticalMarginPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[11.5px]">
                        {theoreticalCostPct >= 28 && theoreticalCostPct <= 32 ? (
                          <Badge tone="green">Cible restauration optimale (28–32%)</Badge>
                        ) : theoreticalCostPct < 28 ? (
                          <Badge tone="green">Excellente marge (&lt; 28%)</Badge>
                        ) : (
                          <Badge tone="amber">Food Cost élevé (&gt; 32%)</Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-mv-border-soft pt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingRecipe(false)}
                        disabled={isSavingRecipe}
                      >
                        Annuler
                      </Button>
                      <Button size="sm" onClick={handleSaveRecipe} disabled={isSavingRecipe}>
                        {isSavingRecipe ? "Enregistrement…" : "Enregistrer la recette"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : recipes.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-mv-border-soft p-6 text-center">
                <ChefHat className="mx-auto mb-2 text-mv-ink-faint" size={28} />
                <p className="text-[13px] font-medium text-mv-ink">Aucune recette configurée</p>
                <p className="mt-1 text-[12px] text-mv-ink-faint">
                  Liez les ingrédients de votre stock pour calculer automatiquement votre marge et déduire les
                  quantités lors de chaque vente.
                </p>
                {canManage && (
                  <Button size="sm" onClick={startEditingRecipe} className="mt-3">
                    <Plus size={14} /> Composer la recette
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  {recipes.map((r) => {
                    const ingredient = inventoryById.get(r.inventoryItemId);
                    const portionCost = (ingredient?.unitCost ?? 0) * r.quantityPerUnit;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border border-mv-border-soft bg-mv-surface px-3 py-2 text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-mv-ink">
                            {ingredient?.name ?? "Ingrédient introuvable"}
                          </span>
                          {ingredient?.category && (
                            <span className="rounded bg-mv-cream-soft px-1.5 py-0.5 text-[10px] text-mv-ink-faint">
                              {ingredient.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-[12px] text-mv-ink-soft">
                            {r.quantityPerUnit} {ingredient?.unit ?? ""}
                          </span>
                          <span className="w-16 font-mono text-[12px] font-medium text-mv-ink">
                            {formatCurrency(portionCost)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Card */}
                <div className="rounded-xl border border-mv-border bg-mv-cream-soft p-3">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Food Cost par portion :</span>
                    <span className="font-mono font-semibold text-mv-ink">
                      {formatCurrency(theoreticalFoodCost)} ({theoreticalCostPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Marge brute unitaire :</span>
                    <span className="font-mono font-semibold text-mv-green-dark">
                      {formatCurrency(theoreticalMargin)} ({theoreticalMarginPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] text-mv-ink-faint">Standard Minerva Flow :</span>
                    {theoreticalCostPct >= 28 && theoreticalCostPct <= 32 ? (
                      <Badge tone="green">Cible optimale (28–32%)</Badge>
                    ) : theoreticalCostPct < 28 ? (
                      <Badge tone="green">Marge supérieure (&lt; 28%)</Badge>
                    ) : (
                      <Badge tone="amber">Food Cost à surveiller (&gt; 32%)</Badge>
                    )}
                  </div>
                </div>
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

      <VideoPlayerModal
        videoUrl={item.videoUrl}
        title={`Vidéo · ${item.name}`}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />
    </div>
  );
}

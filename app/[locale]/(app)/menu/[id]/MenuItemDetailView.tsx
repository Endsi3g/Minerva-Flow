"use client";


import { useTranslations } from "next-intl";
import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
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
import { calculateMenuItemStockStatus } from "@/lib/stock-availability";
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
  Pencil,
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
  const t = useTranslations("menuItemDetail");
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

  // Item details editing state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  async function handleSaveInfo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSavingInfo(true);
    try {
      const name = String(form.get("name") ?? "").trim();
      const category = String(form.get("category") ?? "").trim() || null;
      const price = Number(form.get("price") ?? 0);
      const foodCost = Number(form.get("foodCost") ?? 0);
      const description = String(form.get("description") ?? "").trim() || null;
      const isFeatured = form.get("isFeatured") === "on";

      if (!name) {
        notifyError(t("theDishNameIs"));
        return;
      }

      const updated = await updateMenuItemAction(restaurantId, item.id, {
        name,
        category,
        price,
        foodCost,
        description,
        isFeatured,
      });

      if (updated) {
        setItem(updated);
        setIsEditingInfo(false);
        toast.success(t("dishInformationUpdated"));
      } else {
        notifyError(t("theUpdateFailed"));
      }
    } finally {
      setIsSavingInfo(false);
    }
  }

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
        toast.success(t("recipeSavedAndFood"));
      } else {
        notifyError(t("couldNotSaveThe"));
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
      toast.success(t("imageUpdated"));
    } else {
      notifyError(t("couldNotUpdateThe"));
    }
  }

  async function handleVideoChanged(url: string | null) {
    const updated = await updateMenuItemAction(restaurantId, item.id, { videoUrl: url });
    if (updated) {
      setItem(updated);
      toast.success(url ? t("videoLinkedToThe") : t("videoRemoved"));
    } else {
      notifyError(t("couldNotUpdateThe2"));
    }
  }

  async function handleToggleActive() {
    setToggling(true);
    try {
      const updated = await updateMenuItemAction(restaurantId, item.id, { active: !item.active });
      if (updated) setItem(updated);
      else notifyError(t("theUpdateFailed"));
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t("permanentlyRemoveItemnameFrom", { itemName: item.name }))) return;
    setDeleting(true);
    const ok = await deleteMenuItemAction(restaurantId, item.id);
    if (ok) router.push("/menu");
    else {
      setDeleting(false);
      notifyError(t("deletionFailed"));
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/menu")}
        className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={14} /> {t("allMenu")}
      </button>

      <PageHeader
        eyebrow={item.category ?? "Menu"}
        title={item.name}
        description={item.active ? undefined : t("thisDishIsCurrently")}
        action={
          canManage && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingInfo(true)}
                className="text-[12.5px] font-semibold"
              >
                <Pencil size={13} /> {t("editInfo")}
              </Button>
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                title={item.active ? t("removeFromTheMenu") : "Remettre au menu"}
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
        {!item.active && <Badge tone="neutral">{t("removedFromTheMenu")}</Badge>}
        {stockStatus.status === "rupture" && (
          <Badge tone="red">
            {t("outOfStock0")}
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
                title={t("videoItemname", { itemName: item.name })}
              />
            )}

            <div className="mt-4 rounded-xl bg-mv-cream-soft p-3">
              <div className="mb-2 flex items-center justify-between border-b border-mv-border-soft pb-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                  Tarification & Performance
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green transition-colors hover:text-mv-green-dark"
                  >
                    <Pencil size={11} /> {t("editPrice")}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="flex items-center gap-1 text-[12px] font-semibold uppercase text-mv-ink-faint">
                    <DollarSign size={11} /> Prix
                  </p>
                  <p className="font-display text-[16px] font-medium text-mv-ink">{formatCurrency(item.price)}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[12px] font-semibold uppercase text-mv-ink-faint">
                    <TrendingUp size={11} /> Marge
                  </p>
                  <p className="font-display text-[16px] font-medium text-mv-ink">{Math.round(marginPct * 100)}%</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[12px] font-semibold uppercase text-mv-ink-faint">
                    <ShoppingBag size={11} /> Vendus
                  </p>
                  <p className="font-display text-[16px] font-medium text-mv-ink">{item.unitsSold}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-mv-border-soft bg-mv-surface p-3.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                  {t("dishDescription")}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green transition-colors hover:text-mv-green-dark"
                  >
                    <Pencil size={11} /> {item.description ? t("edit") : t("addADescription")}
                  </button>
                )}
              </div>
              {item.description ? (
                <p className="text-[13.5px] leading-relaxed text-mv-ink-soft">{item.description}</p>
              ) : (
                <p className="text-[12.5px] italic text-mv-ink-faint">
                  {t("noDescriptionEnteredFor")}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card>
            <div className="flex items-start justify-between gap-2 border-b border-mv-border-soft pb-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">{t("recipeCard")}</p>
                <h3 className="font-display text-[16px] font-semibold text-mv-ink">{t("recipeIngredientCost")}</h3>
                <p className="text-[12px] text-mv-ink-soft">
                  {isEditingRecipe
                    ? t("buildTheIngredientsUsed")
                    : t("ingredientsDeductedFromInventory")}
                </p>
              </div>
              {canManage && !isEditingRecipe && (
                <Button size="sm" variant="outline" onClick={startEditingRecipe} className="shrink-0 text-[12px]">
                  <Edit3 size={13} /> {recipes.length === 0 ? t("createTheRecipe") : t("edit")}
                </Button>
              )}
            </div>

            {isEditingRecipe ? (
              <div className="mt-4 space-y-3">
                {inventoryItems.length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">
                    Aucun ingrédient dans l&apos;inventaire. Ajoutez d&apos;abord des articles dans{" "}
                    <Link href="/inventaire" className="font-medium text-mv-green hover:underline">
                      Inventaire
                    </Link>
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
                                placeholder={t("qty")}
                                className="h-8 w-20 rounded-md border border-mv-border bg-mv-cream-soft px-2 text-right font-mono text-[12.5px] text-mv-ink focus:border-mv-green focus:outline-none"
                                aria-label={t("quantityUsedPerPortion")}
                              />
                              <span className="w-12 text-[12px] text-mv-ink-faint">{selectedIng?.unit ?? ""}</span>
                              <span className="w-16 text-right font-mono text-[12px] font-medium text-mv-ink">
                                {formatCurrency(lineCost)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDraftRow(index)}
                                className="rounded p-1 text-mv-ink-faint transition hover:bg-mv-red/10 hover:text-mv-red"
                                title={t("removeTheIngredient")}
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
                      <Plus size={13} /> {t("addIngredient")}
                    </button>

                    {/* Live Food Cost & Margin Preview */}
                    <div className="mt-4 rounded-xl border border-mv-border bg-mv-cream-soft p-3">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-mv-ink-soft">{t("calculatedFoodCost")}</span>
                        <span className="font-mono font-semibold text-mv-ink">
                          {formatCurrency(theoreticalFoodCost)} ({theoreticalCostPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[12.5px]">
                        <span className="text-mv-ink-soft">{t("estimatedGrossMargin")}</span>
                        <span className="font-mono font-semibold text-mv-green-dark">
                          {formatCurrency(theoreticalMargin)} ({theoreticalMarginPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[12px]">
                        {theoreticalCostPct >= 28 && theoreticalCostPct <= 32 ? (
                          <Badge tone="green">{t("optimalRestaurantTarget28")}</Badge>
                        ) : theoreticalCostPct < 28 ? (
                          <Badge tone="green">{t("excellentMargin28")}</Badge>
                        ) : (
                          <Badge tone="amber">{t("highFoodCost32")}</Badge>
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
                        {isSavingRecipe ? t("saving") : t("saveTheRecipe")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : recipes.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-mv-border-soft p-6 text-center">
                <ChefHat className="mx-auto mb-2 text-mv-ink-faint" size={28} />
                <p className="text-[13px] font-medium text-mv-ink">{t("noRecipeSetUp")}</p>
                <p className="mt-1 text-[12px] text-mv-ink-faint">
                  {t("linkTheIngredientsIn")}
                </p>
                {canManage && (
                  <Button size="sm" onClick={startEditingRecipe} className="mt-3">
                    <Plus size={14} /> {t("composeRecipe")}
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
                            {ingredient?.name ?? t("ingredientNotFound")}
                          </span>
                          {ingredient?.category && (
                            <span className="rounded bg-mv-cream-soft px-1.5 py-0.5 text-[12px] text-mv-ink-faint">
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
                    <span className="text-mv-ink-soft">{t("foodCostPerPortion")}</span>
                    <span className="font-mono font-semibold text-mv-ink">
                      {formatCurrency(theoreticalFoodCost)} ({theoreticalCostPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">{t("unitGrossMargin")}</span>
                    <span className="font-mono font-semibold text-mv-green-dark">
                      {formatCurrency(theoreticalMargin)} ({theoreticalMarginPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[12px] text-mv-ink-faint">{t("minervaFlowStandard")}</span>
                    {theoreticalCostPct >= 28 && theoreticalCostPct <= 32 ? (
                      <Badge tone="green">{t("optimalTarget2832")}</Badge>
                    ) : theoreticalCostPct < 28 ? (
                      <Badge tone="green">{t("higherMargin28")}</Badge>
                    ) : (
                      <Badge tone="amber">{t("foodCostToWatch")}</Badge>
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
            aria-label={t("previousDish")}
            title={t("previousDish")}
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
        title={t("videoItemname", { itemName: item.name })}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />

      {canManage && (
        <Modal
          open={isEditingInfo}
          onClose={() => !isSavingInfo && setIsEditingInfo(false)}
          title={t("editDish")}
          description={t("adjustThisDishS")}
        >
          <form onSubmit={handleSaveInfo} className="space-y-4 pt-2">
            <Field label={t("dishName")} required>
              <Input
                name="name"
                defaultValue={item.name}
                required
                placeholder="Ex. Burger Signature, Cappuccino..."
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("category")}>
                <Input
                  name="category"
                  defaultValue={item.category ?? ""}
                  placeholder="Ex. Plats, Boissons, Desserts..."
                />
              </Field>

              <Field label="Prix de vente ($)" required>
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={item.price}
                  required
                />
              </Field>
            </div>

            <Field
              label={t("estimatedIngredientCostFood")}
              hint={t("theoreticalIngredientCostFor")}
            >
              <Input
                name="foodCost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={item.foodCost}
              />
            </Field>

            <Field label="Description">
              <Textarea
                name="description"
                defaultValue={item.description ?? ""}
                rows={3}
                placeholder={t("dishDescriptionKeyIngredients")}
              />
            </Field>

            <label className="flex items-start gap-3 rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-3.5 text-[12px] leading-5 text-mv-ink-soft">
              <input name="isFeatured" type="checkbox" defaultChecked={item.isFeatured ?? false} className="mt-1 size-4 accent-mv-green" />
              <span><span className="block font-semibold text-mv-ink">{t("featureThisDish")}</span>{t("showThisDishIn")}</span>
            </label>

            <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditingInfo(false)}
                disabled={isSavingInfo}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSavingInfo}>
                {isSavingInfo ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

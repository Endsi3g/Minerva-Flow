import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getMenuItems } from "@/lib/data/menu";
import { getInventoryItems } from "@/lib/data/inventory";
import { getRecipeItems } from "@/lib/data/recipes";
import { MenuItemDetailView } from "./MenuItemDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();
  const items = restaurantId ? await getMenuItems(restaurantId) : [];
  const item = items.find((i) => i.id === id);
  return { title: item?.name ?? "Plat" };
}

/**
 * Items ordered by name — same order the Menu list's category filter would
 * naturally read in, and stable across renders, which is what the prev/next
 * carousel needs to make sense as "the rest of the menu".
 */
export default async function MenuItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) notFound();

  const items = await getMenuItems(restaurantId);
  const ordered = [...items].sort((a, b) => a.name.localeCompare(b.name));
  const index = ordered.findIndex((i) => i.id === id);
  if (index === -1) notFound();

  const [inventoryItems, recipeItems] = await Promise.all([
    getInventoryItems(restaurantId),
    getRecipeItems(restaurantId, id),
  ]);

  return (
    <MenuItemDetailView
      restaurantId={restaurantId}
      item={ordered[index]}
      previousId={index > 0 ? ordered[index - 1].id : null}
      nextId={index < ordered.length - 1 ? ordered[index + 1].id : null}
      inventoryItems={inventoryItems}
      recipeItems={recipeItems}
    />
  );
}

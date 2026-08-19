import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getInventoryItems, getWasteSummary } from "@/lib/data/inventory";
import { getSuppliers } from "@/lib/data/suppliers";
import { InventaireView } from "./InventaireView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("inventaire") };
}

export default async function InventairePage() {
  const restaurantId = await getCurrentRestaurantId();
  const monthStart = new Date();
  monthStart.setDate(1);
  const from = monthStart.toISOString().slice(0, 10);

  const [items, suppliers, wasteSummary] = restaurantId
    ? await Promise.all([
        getInventoryItems(restaurantId),
        getSuppliers(restaurantId),
        getWasteSummary(restaurantId, { from }),
      ])
    : [[], [], []];

  return (
    <InventaireView
      restaurantId={restaurantId}
      initialItems={items}
      suppliers={suppliers}
      wasteSummary={wasteSummary}
    />
  );
}

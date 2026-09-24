import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getSuppliers } from "@/lib/data/suppliers";
import { getPurchaseOrders } from "@/lib/data/purchase-orders";
import { getInventoryItems } from "@/lib/data/inventory";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { FournisseursView } from "./FournisseursView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("fournisseurs") };
}

export default async function FournisseursPage() {
  const [restaurantId, membership] = await Promise.all([getCurrentRestaurantId(), getCurrentMembership()]);
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    redirect({ href: "/workspace", locale: await getLocale() });
  }

  const [suppliers, orders, inventoryItems] = restaurantId
    ? await Promise.all([
        getSuppliers(restaurantId),
        getPurchaseOrders(restaurantId),
        getInventoryItems(restaurantId),
      ])
    : [[], [], []];

  return (
    <FournisseursView
      restaurantId={restaurantId}
      initialSuppliers={suppliers}
      initialOrders={orders}
      inventoryItems={inventoryItems}
    />
  );
}

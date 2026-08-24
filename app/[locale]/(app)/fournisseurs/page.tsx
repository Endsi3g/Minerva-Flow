import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getSuppliers } from "@/lib/data/suppliers";
import { getPurchaseOrders } from "@/lib/data/purchase-orders";
import { FournisseursView } from "./FournisseursView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("fournisseurs") };
}

export default async function FournisseursPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [suppliers, orders] = restaurantId
    ? await Promise.all([getSuppliers(restaurantId), getPurchaseOrders(restaurantId)])
    : [[], []];

  return <FournisseursView restaurantId={restaurantId} initialSuppliers={suppliers} initialOrders={orders} />;
}

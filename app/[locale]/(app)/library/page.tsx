import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRestaurantLibraryAssets } from "@/lib/data/library";
import { getCurrentRestaurant } from "@/lib/data/current-restaurant";
import { LibraryView } from "@/components/library/LibraryView";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("library") };
}

export default async function LibraryPage() {
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) {
    redirect("/overview");
  }

  const assets = await getRestaurantLibraryAssets(restaurant.id);

  return <LibraryView initialAssets={assets} restaurantId={restaurant.id} restaurantName={restaurant.name} />;
}

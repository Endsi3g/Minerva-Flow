import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getWorkspaceRestaurants } from "@/lib/data/workspaces";
import { getLtvImpactForRestaurants } from "@/lib/data/impact";
import { aggregateLtvImpacts } from "@/lib/engine/impact";
import { FranchiseView } from "./FranchiseView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("franchise") };
}

export default async function FranchisePage() {
  const restaurantId = await getCurrentRestaurantId();
  const restaurant = restaurantId ? await getRestaurant(restaurantId) : null;

  if (!restaurant?.workspaceId) {
    return (
      <Suspense>
        <FranchiseView restaurants={[]} rollup={null} />
      </Suspense>
    );
  }

  const restaurants = await getWorkspaceRestaurants(restaurant.workspaceId);
  if (restaurants.length < 2) {
    return (
      <Suspense>
        <FranchiseView restaurants={restaurants} rollup={null} />
      </Suspense>
    );
  }

  const impacts = await getLtvImpactForRestaurants(restaurants.map((r) => r.id));
  const rollup = aggregateLtvImpacts(impacts);

  return (
    <Suspense>
      <FranchiseView restaurants={restaurants} rollup={rollup} />
    </Suspense>
  );
}

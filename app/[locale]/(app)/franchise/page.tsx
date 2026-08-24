import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getWorkspaceRestaurants } from "@/lib/data/workspaces";
import { getLtvImpactForRestaurants } from "@/lib/data/impact";
import { aggregateLtvImpacts } from "@/lib/engine/impact";
import { getServiceDays } from "@/lib/data/service-days";
import { FranchiseView } from "./FranchiseView";

function currentMonthRange(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

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
        <FranchiseView restaurants={[]} rollup={null} monthRevenue={0} />
      </Suspense>
    );
  }

  const restaurants = await getWorkspaceRestaurants(restaurant.workspaceId);
  if (restaurants.length < 2) {
    return (
      <Suspense>
        <FranchiseView restaurants={restaurants} rollup={null} monthRevenue={0} />
      </Suspense>
    );
  }

  const { from, to } = currentMonthRange();
  const [impacts, serviceDaysByRestaurant] = await Promise.all([
    getLtvImpactForRestaurants(restaurants.map((r) => r.id)),
    Promise.all(restaurants.map((r) => getServiceDays(r.id, { from, to }))),
  ]);
  const rollup = aggregateLtvImpacts(impacts);
  const monthRevenue = serviceDaysByRestaurant.flat().reduce((sum, d) => sum + d.revenue, 0);

  return (
    <Suspense>
      <FranchiseView restaurants={restaurants} rollup={rollup} monthRevenue={monthRevenue} />
    </Suspense>
  );
}

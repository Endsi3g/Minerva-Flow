import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getLtvImpact } from "@/lib/data/impact";
import { getServiceDays } from "@/lib/data/service-days";
import { ImpactView } from "./ImpactView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("impact") };
}

function currentMonthRange(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export default async function ImpactPage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return (
      <Suspense>
        <ImpactView restaurantName={null} impact={null} monthRevenue={0} />
      </Suspense>
    );
  }

  const { from, to } = currentMonthRange();
  const [restaurant, impact, serviceDays] = await Promise.all([
    getRestaurant(restaurantId),
    getLtvImpact(restaurantId),
    getServiceDays(restaurantId, { from, to }),
  ]);
  const monthRevenue = serviceDays.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <Suspense>
      <ImpactView restaurantName={restaurant?.name ?? null} impact={impact} monthRevenue={monthRevenue} />
    </Suspense>
  );
}

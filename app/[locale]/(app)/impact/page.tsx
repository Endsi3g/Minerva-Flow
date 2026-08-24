import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getLtvImpact } from "@/lib/data/impact";
import { ImpactView } from "./ImpactView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("impact") };
}

export default async function ImpactPage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return (
      <Suspense>
        <ImpactView restaurantName={null} impact={null} />
      </Suspense>
    );
  }

  const [restaurant, impact] = await Promise.all([getRestaurant(restaurantId), getLtvImpact(restaurantId)]);

  return (
    <Suspense>
      <ImpactView restaurantName={restaurant?.name ?? null} impact={impact} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers } from "@/lib/data/customers";
import { getRestaurant } from "@/lib/data/restaurants";
import { FidelisationView } from "./FidelisationView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("fidelisation") };
}

export default async function FidelisationPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [customers, restaurant] = restaurantId
    ? await Promise.all([getCustomers(restaurantId), getRestaurant(restaurantId)])
    : [[], null];

  return (
    <FidelisationView
      restaurantId={restaurantId}
      restaurantName={restaurant?.name ?? "Restaurant"}
      restaurantTimezone={restaurant?.timezone ?? "America/Toronto"}
      initialCustomers={customers}
      loyaltyPointsPerDollar={restaurant?.loyaltyPointsPerDollar ?? 1}
      loyaltyTierThresholds={{
        tier2: restaurant?.loyaltyTier2Threshold ?? 150,
        tier3: restaurant?.loyaltyTier3Threshold ?? 400,
      }}
    />
  );
}

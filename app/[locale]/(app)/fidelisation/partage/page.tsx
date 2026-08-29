import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getLoyaltySharesForRestaurant } from "@/lib/data/loyalty-shares";
import { PartageView } from "./PartageView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Partage — Fidélisation" };
}

export default async function PartagePage() {
  const restaurantId = await getCurrentRestaurantId();

  const [restaurant, loyaltyShares] = restaurantId
    ? await Promise.all([getRestaurant(restaurantId), getLoyaltySharesForRestaurant(restaurantId)])
    : [null, []];

  return (
    <PartageView
      restaurantId={restaurantId}
      restaurantName={restaurant?.name ?? "Restaurant"}
      initialLoyaltyShares={loyaltyShares}
    />
  );
}

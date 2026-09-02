import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getLoyaltySharesForRestaurant } from "@/lib/data/loyalty-shares";
import { PartageView } from "./PartageView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Partage — Fidélisation" };
}

export default async function PartagePage() {
  const restaurantId = await getCurrentRestaurantId();
  const loyaltyShares = restaurantId ? await getLoyaltySharesForRestaurant(restaurantId) : [];

  return <PartageView restaurantId={restaurantId} initialLoyaltyShares={loyaltyShares} />;
}

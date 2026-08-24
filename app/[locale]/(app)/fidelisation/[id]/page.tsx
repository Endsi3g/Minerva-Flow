import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomer, getLoyaltyRewards } from "@/lib/data/customers";
import { getRestaurant } from "@/lib/data/restaurants";
import { CustomerDetailView } from "./CustomerDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();
  const customer = restaurantId ? await getCustomer(restaurantId, id) : null;
  return { title: customer?.name ?? "Client" };
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();
  const customer = restaurantId ? await getCustomer(restaurantId, id) : null;

  if (!restaurantId || !customer) notFound();

  const [rewards, restaurant] = await Promise.all([getLoyaltyRewards(restaurantId), getRestaurant(restaurantId)]);

  return (
    <CustomerDetailView
      restaurantId={restaurantId}
      initialCustomer={customer}
      rewards={rewards}
      loyaltyPointsPerDollar={restaurant?.loyaltyPointsPerDollar ?? 1}
      loyaltyTierThresholds={{
        tier2: restaurant?.loyaltyTier2Threshold ?? 150,
        tier3: restaurant?.loyaltyTier3Threshold ?? 400,
      }}
    />
  );
}

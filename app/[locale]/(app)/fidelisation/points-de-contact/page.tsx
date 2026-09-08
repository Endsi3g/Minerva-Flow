import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getTouchpointFunnels } from "@/lib/data/physical-touchpoints";
import { PointsDeContactView } from "./PointsDeContactView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Points de contact — Fidélisation" };
}

export default async function PointsDeContactPage() {
  const restaurantId = await getCurrentRestaurantId();
  const funnels = restaurantId ? await getTouchpointFunnels(restaurantId) : [];

  return <PointsDeContactView restaurantId={restaurantId} initialFunnels={funnels} />;
}

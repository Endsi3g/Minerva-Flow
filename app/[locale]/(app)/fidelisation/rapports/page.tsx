import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getErpMoneyMetrics } from "@/lib/data/erp-metrics";
import { RapportsView } from "./RapportsView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Rapports — Fidélisation" };
}

export default async function RapportsPage() {
  const restaurantId = await getCurrentRestaurantId();
  const metrics = restaurantId ? await getErpMoneyMetrics(restaurantId, 30) : null;

  return <RapportsView metrics={metrics} />;
}

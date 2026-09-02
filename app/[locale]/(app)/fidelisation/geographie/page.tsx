import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers } from "@/lib/data/customers";
import { GeographieView } from "./GeographieView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Provenance des clients — Fidélisation" };
}

export default async function GeographiePage() {
  const restaurantId = await getCurrentRestaurantId();
  const customers = restaurantId ? await getCustomers(restaurantId) : [];

  return <GeographieView customers={customers} />;
}

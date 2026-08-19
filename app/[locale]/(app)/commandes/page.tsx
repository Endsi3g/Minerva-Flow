import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getOrdersForDay } from "@/lib/data/orders";
import { CommandesView } from "./CommandesView";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("commandes") };
}

export default async function CommandesPage() {
  const restaurantId = await getCurrentRestaurantId();
  const { start, end } = todayRange();

  const orders = restaurantId ? await getOrdersForDay(restaurantId, start, end) : [];

  return <CommandesView restaurantId={restaurantId} initialOrders={orders} dayStart={start} dayEnd={end} />;
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId, getCurrentRestaurant } from "@/lib/data/current-restaurant";
import { getOrdersForDay } from "@/lib/data/orders";
import { getMenuItems } from "@/lib/data/menu";
import { getTodayMenuViews } from "@/lib/data/menu-views";
import { getServiceQuotesForRestaurant } from "@/lib/data/service-quotes";
import { getRestaurantDayWindow } from "@/lib/orders/scheduling";
import { CommandesView } from "./CommandesView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("commandes") };
}

export default async function CommandesPage() {
  const [restaurant, restaurantId] = await Promise.all([getCurrentRestaurant(), getCurrentRestaurantId()]);
  const { start, end, nowMs } = getRestaurantDayWindow(restaurant?.timezone ?? "America/Toronto");

  const [orders, menuItems, menuViews, serviceQuotesResult] = restaurantId
    ? await Promise.all([
        getOrdersForDay(restaurantId, start, end),
        getMenuItems(restaurantId),
        getTodayMenuViews(restaurantId),
        getServiceQuotesForRestaurant(restaurantId),
      ])
    : [[], [], 0, { ok: true as const, quotes: [] }];

  return (
    <CommandesView
      key={restaurantId ?? "aucun-restaurant"}
      restaurantId={restaurantId}
      initialOrders={orders}
      dayStart={start}
      dayEnd={end}
      menuItems={menuItems.filter((m) => m.active)}
      planTier={restaurant?.planTier ?? "essentiel"}
      todayMenuViews={menuViews}
      initialServiceQuotes={serviceQuotesResult.ok ? serviceQuotesResult.quotes : []}
      initialServiceQuotesError={!serviceQuotesResult.ok}
      taxRate={restaurant?.taxRate ?? 0.14975}
      restaurantTimezone={restaurant?.timezone ?? "America/Toronto"}
      initialNowMs={nowMs}
    />
  );
}

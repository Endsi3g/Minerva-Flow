import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRestaurantIntegrations } from "@/lib/data/integrations";
import { getCurrentRestaurant } from "@/lib/data/current-restaurant";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("integrations") };
}

export default async function IntegrationsPage() {
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) {
    redirect("/overview");
  }

  const integrations = await getRestaurantIntegrations(restaurant.id);

  return <IntegrationsView initialIntegrations={integrations} restaurantName={restaurant.name} restaurantId={restaurant.id} />;
}

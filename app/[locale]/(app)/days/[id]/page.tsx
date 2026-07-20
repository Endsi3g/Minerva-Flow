import { getServiceDay } from "@/lib/data/service-days";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { ServiceDayDetailView } from "./ServiceDayDetailView";
import { notFound } from "next/navigation";

export default async function ServiceDayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return <div className="p-6 text-mv-ink-soft">Aucun restaurant sélectionné.</div>;
  }

  const day = await getServiceDay(restaurantId, id);
  if (!day) notFound();

  return <ServiceDayDetailView day={day} />;
}

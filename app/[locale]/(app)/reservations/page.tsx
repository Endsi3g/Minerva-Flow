import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId, getCurrentRestaurant } from "@/lib/data/current-restaurant";
import { getTables, getReservationsForDay } from "@/lib/data/reservations";
import { getReservationPlatformConnections } from "@/lib/data/reservation-platforms";
import { planTierAtLeast } from "@/lib/plan-tier";
import { PlanTierLockedState } from "@/components/ui/PlanTierLockedState";
import { ReservationsView } from "./ReservationsView";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("reservations") };
}

export default async function ReservationsPage() {
  const restaurant = await getCurrentRestaurant();

  if (restaurant && !planTierAtLeast(restaurant.planTier, "croissance")) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <PlanTierLockedState
          minimumTier="croissance"
          featureName="La gestion des réservations"
          description="Suivi des réservations, gestion des tables et intégrations OpenTable/Resy/SevenRooms — disponible avec le forfait Croissance."
        />
      </div>
    );
  }

  const restaurantId = await getCurrentRestaurantId();
  const { start, end } = todayRange();

  const [tables, reservations, platformConnections] = restaurantId
    ? await Promise.all([
        getTables(restaurantId),
        getReservationsForDay(restaurantId, start, end),
        getReservationPlatformConnections(restaurantId),
      ])
    : [[], [], []];

  return (
    <ReservationsView
      restaurantId={restaurantId}
      initialTables={tables}
      initialReservations={reservations}
      initialDayStart={start}
      initialPlatformConnections={platformConnections}
    />
  );
}

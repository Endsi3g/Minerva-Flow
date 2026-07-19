import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getTables, getReservationsForDay } from "@/lib/data/reservations";
import { getReservationPlatformConnections } from "@/lib/data/reservation-platforms";
import { ReservationsView } from "./ReservationsView";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function ReservationsPage() {
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

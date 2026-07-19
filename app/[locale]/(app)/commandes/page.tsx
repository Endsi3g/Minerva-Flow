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

export default async function CommandesPage() {
  const restaurantId = await getCurrentRestaurantId();
  const { start, end } = todayRange();

  const orders = restaurantId ? await getOrdersForDay(restaurantId, start, end) : [];

  return <CommandesView restaurantId={restaurantId} initialOrders={orders} dayStart={start} dayEnd={end} />;
}

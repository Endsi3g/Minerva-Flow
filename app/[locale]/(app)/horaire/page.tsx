import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getEmployees } from "@/lib/data/employees";
import { getShiftSchedulesForRange } from "@/lib/data/shift-schedules";
import { HoraireView } from "./HoraireView";

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function HorairePage() {
  const restaurantId = await getCurrentRestaurantId();
  const now = new Date();
  
  // Calculate month boundaries for full calendar grid
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const gridStart = mondayOf(monthStart);
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (7 - (gridEnd.getDay() || 7)));

  const weekStart = mondayOf(now);

  const [employees, shifts] = restaurantId
    ? await Promise.all([
        getEmployees(restaurantId),
        getShiftSchedulesForRange(restaurantId, toIsoDate(gridStart), toIsoDate(gridEnd)),
      ])
    : [[], []];

  return (
    <HoraireView
      restaurantId={restaurantId}
      initialEmployees={employees.filter((e) => e.active)}
      initialShifts={shifts}
      initialWeekStart={toIsoDate(weekStart)}
    />
  );
}

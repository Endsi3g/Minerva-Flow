import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getEmployees } from "@/lib/data/employees";
import { getShiftSchedulesForWeek } from "@/lib/data/shift-schedules";
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
  const weekStart = mondayOf(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const [employees, shifts] = restaurantId
    ? await Promise.all([
        getEmployees(restaurantId),
        getShiftSchedulesForWeek(restaurantId, toIsoDate(weekStart), toIsoDate(weekEnd)),
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

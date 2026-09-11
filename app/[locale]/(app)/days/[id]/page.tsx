import { getServiceDay, getServiceDays } from "@/lib/data/service-days";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getShiftSchedulesForRange } from "@/lib/data/shift-schedules";
import { getEmployees } from "@/lib/data/employees";
import { getFinancialTransactions } from "@/lib/data/finance";
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

  // Compute 7 days prior date for day-over-day comparison
  const dayDate = new Date(day.date + "T12:00:00Z");
  dayDate.setUTCDate(dayDate.getUTCDate() - 7);
  const prevWeekDate = dayDate.toISOString().slice(0, 10);

  const [shifts, employees, transactions, prevWeekDays] = await Promise.all([
    getShiftSchedulesForRange(restaurantId, day.date, day.date),
    getEmployees(restaurantId),
    getFinancialTransactions(restaurantId, { from: day.date, to: day.date }),
    getServiceDays(restaurantId, { from: prevWeekDate, to: prevWeekDate }),
  ]);

  const prevWeekDay = prevWeekDays.find((d) => d.date === prevWeekDate) ?? null;

  return (
    <ServiceDayDetailView
      day={day}
      shifts={shifts}
      employees={employees}
      transactions={transactions}
      prevWeekDay={prevWeekDay}
    />
  );
}

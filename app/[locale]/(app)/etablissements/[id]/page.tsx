import { notFound } from "next/navigation";
import { getRestaurant } from "@/lib/data/restaurants";
import { getRevenueByRestaurant } from "@/lib/data/service-days";
import { getServiceDays } from "@/lib/data/service-days";
import { getEmployees } from "@/lib/data/employees";
import { getPrograms } from "@/lib/data/programs";
import { isoDaysAgo } from "@/lib/utils";
import { EtablissementDetailView } from "./EtablissementDetailView";

export default async function EtablissementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = await getRestaurant(id);
  if (!restaurant) notFound();

  const [revenueByRestaurant, recentDays, employees, programs] = await Promise.all([
    getRevenueByRestaurant([id]),
    getServiceDays(id, { from: isoDaysAgo(30) }),
    getEmployees(id),
    getPrograms(id),
  ]);

  return (
    <EtablissementDetailView
      restaurant={restaurant}
      stats={revenueByRestaurant[id] ?? { revenue: 0, delta: 0 }}
      recentDays={recentDays}
      activeEmployeeCount={employees.filter((e) => e.active).length}
      activeProgramCount={programs.filter((p) => p.status === "actif").length}
    />
  );
}

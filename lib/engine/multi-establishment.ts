import type { Restaurant, ServiceDay, MenuItem } from "@/lib/types";

export type RestaurantBenchmark = {
  restaurantId: string;
  name: string;
  city: string;
  monthRevenue: number;
  todayRevenue: number;
  foodCostPct: number;
  laborCostPct: number | null;
  coversToday: number;
  dailyTargetNeeded: number;
  retentionRevenue: number;
  posProvider: string;
  posStatus: "connecte" | "attente" | "deconnecte";
  activeMenuItemsCount: number;
};

export type MultiEstablishmentRollup = {
  restaurantCount: number;
  totalMonthRevenue: number;
  totalTodayRevenue: number;
  weightedFoodCostPct: number;
  weightedLaborCostPct: number | null;
  totalCoversToday: number;
  totalDailyTargetNeeded: number;
  totalRetentionRevenue: number;
  benchmarks: RestaurantBenchmark[];
};

export function computeMultiEstablishmentRollup({
  restaurants,
  dataByRestaurant,
}: {
  restaurants: Restaurant[];
  dataByRestaurant: Map<
    string,
    {
      serviceDays: ServiceDay[];
      menuItems: MenuItem[];
      laborCostPct: number | null;
      todayIso: string;
      dailyCoversNeeded: number;
      retentionRevenue: number;
      posProvider: string;
      posStatus: "connecte" | "attente" | "deconnecte";
    }
  >;
}): MultiEstablishmentRollup {
  const benchmarks: RestaurantBenchmark[] = [];

  let totalMonthRevenue = 0;
  let totalTodayRevenue = 0;
  let weightedFoodCostSum = 0;
  let totalFoodCostRevenue = 0;
  let weightedLaborCostSum = 0;
  let totalLaborRevenue = 0;
  let totalCoversToday = 0;
  let totalDailyTargetNeeded = 0;
  let totalRetentionRevenue = 0;

  for (const r of restaurants) {
    const data = dataByRestaurant.get(r.id);
    if (!data) continue;

    const monthRev = data.serviceDays.reduce((sum, d) => sum + d.revenue, 0);
    const todayDay = data.serviceDays.find((d) => d.date === data.todayIso);
    const todayRev = todayDay?.revenue ?? 0;
    const coversToday = todayDay?.reservationCount ?? Math.round(todayRev / 38);

    // Food Cost %
    const itemsWithCost = data.menuItems.filter((i) => i.foodCost && i.price > 0 && i.active);
    let foodCostPct = 29.5;
    if (itemsWithCost.length > 0) {
      const cost = itemsWithCost.reduce((s, i) => s + (i.foodCost ?? 0), 0);
      const price = itemsWithCost.reduce((s, i) => s + i.price, 0);
      foodCostPct = Math.round((cost / price) * 1000) / 10;
    }

    totalMonthRevenue += monthRev;
    totalTodayRevenue += todayRev;
    weightedFoodCostSum += foodCostPct * (monthRev || 1);
    totalFoodCostRevenue += monthRev || 1;

    if (data.laborCostPct !== null) {
      weightedLaborCostSum += data.laborCostPct * (monthRev || 1);
      totalLaborRevenue += monthRev || 1;
    }

    totalCoversToday += coversToday;
    totalDailyTargetNeeded += data.dailyCoversNeeded;
    totalRetentionRevenue += data.retentionRevenue;

    benchmarks.push({
      restaurantId: r.id,
      name: r.name,
      city: r.city || "Emplacement",
      monthRevenue: monthRev,
      todayRevenue: todayRev,
      foodCostPct,
      laborCostPct: data.laborCostPct,
      coversToday,
      dailyTargetNeeded: data.dailyCoversNeeded,
      retentionRevenue: data.retentionRevenue,
      posProvider: data.posProvider,
      posStatus: data.posStatus,
      activeMenuItemsCount: data.menuItems.filter((i) => i.active).length,
    });
  }

  // Sort benchmarks by monthRevenue descending
  benchmarks.sort((a, b) => b.monthRevenue - a.monthRevenue);

  const weightedFoodCostPct =
    totalFoodCostRevenue > 0 ? Math.round((weightedFoodCostSum / totalFoodCostRevenue) * 10) / 10 : 29.5;
  const weightedLaborCostPct =
    totalLaborRevenue > 0 ? Math.round((weightedLaborCostSum / totalLaborRevenue) * 10) / 10 : null;

  return {
    restaurantCount: restaurants.length,
    totalMonthRevenue,
    totalTodayRevenue,
    weightedFoodCostPct,
    weightedLaborCostPct,
    totalCoversToday,
    totalDailyTargetNeeded,
    totalRetentionRevenue,
    benchmarks,
  };
}

import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Store } from "lucide-react";
import { getCurrentMembership, getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers } from "@/lib/data/customers";
import { getMenuItems } from "@/lib/data/menu";
import { createClient } from "@/lib/supabase/server";
import { LifetimeValueView, type AcquisitionCostRow } from "./LifetimeValueView";
import type { AcquisitionCostCategory } from "./actions";

export const metadata: Metadata = { title: "Valeur client & acquisition — Fidélisation" };

export default async function LifetimeValuePage() {
  const [restaurantId, membership] = await Promise.all([getCurrentRestaurantId(), getCurrentMembership()]);
  if (!restaurantId) return <EmptyState icon={Store} title="Aucun établissement sélectionné" description="Choisissez un établissement pour consulter sa valeur client." action={<Button href="/workspace">Choisir un établissement</Button>} />;

  const [customers, menuItems] = await Promise.all([getCustomers(restaurantId), getMenuItems(restaurantId)]);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const supabase = await createClient();
  const [costResult, newCustomerResult] = await Promise.all([
    supabase.from("customer_acquisition_costs").select("id, category, amount, spent_on, note").eq("restaurant_id", restaurantId).gte("spent_on", cutoffDate).order("spent_on", { ascending: false }),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("created_at", `${cutoffDate}T00:00:00.000Z`),
  ]);
  const costs = ((costResult.data ?? []) as unknown as Array<{ id: string; category: AcquisitionCostCategory; amount: number | string; spent_on: string; note: string | null }>).map((row) => ({
    id: row.id,
    category: row.category,
    amount: Number(row.amount),
    spentOn: row.spent_on,
    note: row.note,
  })) satisfies AcquisitionCostRow[];
  const customersWithSpend = customers.filter((customer) => customer.totalSpent > 0);
  const revenueLtv = customersWithSpend.length ? customersWithSpend.reduce((sum, customer) => sum + customer.totalSpent, 0) / customersWithSpend.length : 0;
  const pricedItems = menuItems.filter((item) => item.price > 0 && item.active && !item.isDraft);
  const weightedUnits = pricedItems.reduce((sum, item) => sum + Math.max(0, item.unitsSold), 0);
  const grossMarginPct = weightedUnits > 0
    ? pricedItems.reduce((sum, item) => sum + Math.max(0, item.unitsSold) * Math.max(0, Math.min(1, (item.price - item.foodCost) / item.price)), 0) / weightedUnits
    : pricedItems.length
      ? pricedItems.reduce((sum, item) => sum + Math.max(0, Math.min(1, (item.price - item.foodCost) / item.price)), 0) / pricedItems.length
      : 0;
  const marginLtv = revenueLtv * grossMarginPct;
  const metrics = { customers: customersWithSpend.length, revenueLtv, marginLtv, combinedLtv: revenueLtv + marginLtv, grossMarginPct };
  const canEdit = membership?.restaurantId === restaurantId && ["owner", "manager"].includes(membership.role);

  return <LifetimeValueView restaurantId={restaurantId} metrics={metrics} costs={costs} newCustomers={newCustomerResult.count ?? 0} canEdit={canEdit} />;
}

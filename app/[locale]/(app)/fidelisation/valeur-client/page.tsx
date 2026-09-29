import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Store } from "lucide-react";
import { getCurrentMembership, getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers } from "@/lib/data/customers";
import { getMenuItems } from "@/lib/data/menu";
import { createClient } from "@/lib/supabase/server";
import { computeLifetimeValueComponents } from "@/lib/engine/lifetime-value";
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
  const ltv = computeLifetimeValueComponents(customers, menuItems);
  const metrics = { ...ltv };
  const canEdit = membership?.restaurantId === restaurantId && ["owner", "manager"].includes(membership.role);

  return <LifetimeValueView restaurantId={restaurantId} metrics={metrics} costs={costs} newCustomers={newCustomerResult.count ?? 0} canEdit={canEdit} />;
}

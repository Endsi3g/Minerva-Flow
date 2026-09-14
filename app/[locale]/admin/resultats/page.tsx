import type { Metadata } from "next";
import { getAllRestaurantsForAdmin, getPlatformShareableMetrics } from "@/lib/data/admin";
import { AdminResultatsView } from "./AdminResultatsView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Résultats — Panneau opérateur" };
}

export default async function AdminResultatsPage() {
  const [restaurants, platformMetrics] = await Promise.all([
    getAllRestaurantsForAdmin(),
    getPlatformShareableMetrics("30d"),
  ]);

  return (
    <AdminResultatsView
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
      initialMetrics={platformMetrics ?? []}
    />
  );
}

import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRetentionFunnelMetrics, type RetentionTimeRange } from "@/lib/data/retention-metrics";
import { RetentionFunnelView } from "./RetentionFunnelView";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Store } from "lucide-react";

export const metadata: Metadata = {
  title: "Entonnoir de rétention & 10 KPI clés — Minerva Flow",
  description: "Suivi des 15 événements de cycle de vie client, rétention à 2 visites et attribution du chiffre d'affaires des campagnes.",
};

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function RetentionFunnelPage({ searchParams }: Props) {
  const restaurantId = await getCurrentRestaurantId();
  const { range } = await searchParams;

  const validRange: RetentionTimeRange =
    range === "7d" || range === "30d" || range === "90d" || range === "all" ? range : "30d";

  if (!restaurantId) {
    return (
      <div>
        <PageHeader
          eyebrow="Rapports d'impact"
          title="Entonnoir de rétention"
          description="Analysez les 15 événements de cycle de vie et les 10 KPI essentiels."
        />
        <EmptyState
          icon={Store}
          title="Aucun établissement configuré"
          description="Veuillez sélectionner ou configurer un établissement pour afficher l'entonnoir."
          action={
            <Button href="/onboarding" size="sm">
              Configurer un établissement
            </Button>
          }
        />
      </div>
    );
  }

  const data = await getRetentionFunnelMetrics(restaurantId, validRange);

  return <RetentionFunnelView data={data} restaurantId={restaurantId} />;
}

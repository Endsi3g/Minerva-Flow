import type { Metadata } from "next";
import { getCurrentRestaurant } from "@/lib/data/current-restaurant";
import { getRetentionFunnelMetrics, getShareableMetrics } from "@/lib/data/retention-metrics";
import { getWorkspace } from "@/lib/data/workspaces";
import { ResultatsView } from "./ResultatsView";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Store } from "lucide-react";
import type { RetentionTimeRange } from "@/lib/data/retention-metrics";

const validRanges: RetentionTimeRange[] = ["7d", "30d", "90d", "all"];

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Résultats à partager — Fidélisation" };
}

export default async function ResultatsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const restaurant = await getCurrentRestaurant();
  const { period } = await searchParams;
  const timeRange = validRanges.includes(period as RetentionTimeRange) ? (period as RetentionTimeRange) : "30d";

  if (!restaurant) {
    return (
      <div>
        <PageHeader
          eyebrow="Fidélisation"
          title="Résultats à partager"
          description="Générez une carte de résultats prête pour vos réseaux sociaux."
        />
        <EmptyState
          icon={Store}
          title="Aucun établissement configuré"
          description="Veuillez sélectionner ou configurer un établissement pour générer une carte de résultats."
          action={
            <Button href="/onboarding" size="sm">
              Configurer un établissement
            </Button>
          }
        />
      </div>
    );
  }

  const [data, workspace] = await Promise.all([
    getRetentionFunnelMetrics(restaurant.id, timeRange),
    restaurant.workspaceId ? getWorkspace(restaurant.workspaceId) : Promise.resolve(null),
  ]);

  const metrics = getShareableMetrics(data);
  const restaurantUrl = restaurant.website || process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";

  return (
    <ResultatsView
      metrics={metrics}
      timeRange={timeRange}
      restaurantName={restaurant.name}
      logoUrl={workspace?.logoUrl ?? null}
      restaurantUrl={restaurantUrl}
    />
  );
}

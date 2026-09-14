"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ShareCardConfigurator } from "@/components/fidelisation/ShareCardConfigurator";
import type { ShareableMetric } from "@/lib/data/retention-metrics";

type Props = {
  metrics: ShareableMetric[];
  restaurantName: string;
  logoUrl: string | null;
  restaurantUrl: string;
};

export function ResultatsView({ metrics, restaurantName, logoUrl, restaurantUrl }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fidélisation"
        title="Résultats à partager"
        description="Générez une carte de résultats prête pour vos réseaux sociaux, à partir de vos vraies statistiques de fidélisation."
      />
      <ShareCardConfigurator
        metrics={metrics}
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        restaurantUrl={restaurantUrl}
      />
    </div>
  );
}

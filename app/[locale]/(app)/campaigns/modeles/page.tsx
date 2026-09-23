import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Store } from "lucide-react";
import { getCurrentRestaurant } from "@/lib/data/current-restaurant";
import { CampaignsSubNav } from "../CampaignsSubNav";
import { PrioritizedCampaignsStudio } from "@/components/campaigns/PrioritizedCampaignsStudio";

export const metadata: Metadata = { title: "Automatisations marketing" };

export default async function CampaignModelsPage() {
  const restaurant = await getCurrentRestaurant();
  return (
    <div className="space-y-5">
      <CampaignsSubNav />
      <PageHeader
        eyebrow="Marketing"
        title="Automatisations"
        description="Activez les relances qui répondent à un événement client et suivez les consentements avant chaque envoi."
      />
      {restaurant ? (
        <PrioritizedCampaignsStudio restaurantId={restaurant.id} restaurantName={restaurant.name} />
      ) : (
        <EmptyState icon={Store} title="Aucun établissement sélectionné" description="Sélectionnez un établissement pour consulter ses automatisations." />
      )}
    </div>
  );
}

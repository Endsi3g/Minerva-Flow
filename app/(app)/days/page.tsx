import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DaysView } from "./DaysView";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getServiceDays } from "@/lib/data/service-days";
import { isoDaysAgo, DEFAULT_HISTORY_WINDOW_DAYS } from "@/lib/utils";
import { Store } from "lucide-react";

export default async function DaysPage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return (
      <div>
        <PageHeader eyebrow="Journées de service" title="Journées" />
        <EmptyState
          icon={Store}
          title="Aucun restaurant configuré"
          description="Créez ou rejoignez un restaurant pour suivre vos journées de service."
          action={
            <Button href="/onboarding" size="sm">
              Configurer un restaurant
            </Button>
          }
        />
      </div>
    );
  }

  const serviceDays = await getServiceDays(restaurantId, { from: isoDaysAgo(DEFAULT_HISTORY_WINDOW_DAYS) });

  return <DaysView initialServiceDays={serviceDays} />;
}

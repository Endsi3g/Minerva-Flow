import * as React from "react";
import { EmptyState, Button } from "minerva-flow";
import { CalendarX2, Search, PlusCircle } from "lucide-react";

export function Default() {
  return (
    <div className="w-[380px]">
      <EmptyState
        icon={CalendarX2}
        title="Aucune réservation aujourd'hui"
        description="Les réservations confirmées pour la soirée apparaîtront ici."
      />
    </div>
  );
}

export function WithAction() {
  return (
    <div className="w-[380px]">
      <EmptyState
        icon={Search}
        title="Aucun résultat pour « saumon »"
        description="Essayez un autre terme ou videz les filtres du menu."
        action={
          <Button size="sm" variant="secondary">
            Réinitialiser les filtres
          </Button>
        }
      />
    </div>
  );
}

export function NoDescription() {
  return (
    <div className="w-[380px]">
      <EmptyState icon={PlusCircle} title="Créez votre premier menu" />
    </div>
  );
}

import { Skeleton } from "@/components/ui/Skeleton";
import { EditorialLoadingState } from "@/components/ui/EditorialLoadingState";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-9 w-48" />
      </div>
      <Skeleton className="h-10 w-96 rounded-full" />
      <EditorialLoadingState
        title="Chargement des paramètres de l'établissement…"
        subtitle="Initialisation des modules de configuration et synchronisation sécurisée."
        rows={4}
      />
    </div>
  );
}

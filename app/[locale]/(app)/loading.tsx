import { EditorialLoadingState } from "@/components/ui/EditorialLoadingState";

export default function AppLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-6">
      <div className="w-full">
        <EditorialLoadingState
          title="Préparation de l'espace de travail…"
          subtitle="Chargement des données en temps réel de votre établissement."
          rows={3}
        />
      </div>
    </div>
  );
}

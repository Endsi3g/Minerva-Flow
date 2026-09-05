import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/profile";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AuthShell } from "@/components/auth/AuthShell";

const ONBOARDING_PANEL_POINTS = [
  { title: "Aucune carte requise", description: "Vous entrez dans l'application dès cette étape — aucun engagement, aucun paiement." },
  { title: "Rien n'est figé", description: "Nom, adresse, équipe, outils connectés : tout se modifie à tout moment depuis vos paramètres." },
  { title: "Vos données restent les vôtres", description: "Hébergées au Canada, jamais revendues, exportables en un clic si vous partez un jour." },
];

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileRow, membership] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle(),
    getCurrentMembership(),
  ]);

  // Redirect to the app only when onboarding is done AND the user actually
  // has an active restaurant — an account whose membership got orphaned
  // after onboarding (deleted restaurant, revoked membership, ...) would
  // otherwise be bounced straight back to an empty Overview by this guard,
  // with no way to reach the wizard that could fix it.
  const onboardingCompleted = (profileRow.data as { onboarding_completed: boolean } | null)?.onboarding_completed;
  if (onboardingCompleted && membership) {
    redirect("/overview");
  }

  const [profile, restaurant] = await Promise.all([
    getMyProfile(),
    membership ? getRestaurant(membership.restaurantId) : Promise.resolve(null),
  ]);

  return (
    <AuthShell
      panelHeadline="Presque prêt. Configurons votre établissement."
      panelSubline="Le reste — adresse, chiffres clés, outils — se complète en tout temps depuis l'application, sans bloquer votre accès."
      panelPoints={ONBOARDING_PANEL_POINTS}
      footer={
        <p className="text-center text-[11.5px] text-mv-ink-faint">
          Besoin d&apos;aide ? L&apos;équipe Minerva reste disponible à tout moment.
        </p>
      }
    >
      <OnboardingWizard
        userId={user.id}
        restaurantId={membership?.restaurantId ?? ""}
        restaurantName={restaurant?.name ?? "Mon restaurant"}
        initialServiceModel={restaurant?.serviceModel === "cafe" ? "cafe" : "restaurant"}
        initialFullName={profile?.fullName ?? ""}
        initialAvatarUrl={profile?.avatarUrl ?? null}
        initialRole={membership?.role ?? "owner"}
      />
    </AuthShell>
  );
}

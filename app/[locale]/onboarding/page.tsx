import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/profile";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if ((profileRow as { onboarding_completed: boolean } | null)?.onboarding_completed) {
    redirect("/overview");
  }

  const [profile, membership] = await Promise.all([getMyProfile(), getCurrentMembership()]);
  const restaurant = membership ? await getRestaurant(membership.restaurantId) : null;

  return (
    <AuthShell
      step={{ current: 2, total: 2, label: "Restaurant" }}
      panelHeadline="Presque prêt. Configurons votre établissement."
      panelSubline="Le reste — adresse, chiffres clés, outils — se complète en tout temps depuis l'application, sans bloquer votre accès."
      footer={
        <p className="text-center text-[11.5px] text-mv-ink-faint">
          Besoin d&apos;aide ? L&apos;équipe Minerva reste disponible à tout moment.
        </p>
      }
    >
      <h1 className="font-display text-[28px] font-medium tracking-tight text-mv-ink sm:text-[32px]">
        Faites connaissance
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
        Personnalisez votre profil et le nom de votre établissement.
      </p>

      <div className="mt-6">
        <OnboardingWizard
          userId={user.id}
          restaurantId={membership?.restaurantId ?? ""}
          restaurantName={restaurant?.name ?? "Mon restaurant"}
          initialFullName={profile?.fullName ?? ""}
          initialAvatarUrl={profile?.avatarUrl ?? null}
          initialRole={membership?.role ?? "owner"}
        />
      </div>
    </AuthShell>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/profile";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { LogoMark } from "@/components/shell/Logo";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-display text-[17px] font-medium text-mv-ink">
          Minerva <span className="text-mv-green-dark">Flow</span>
        </span>
      </div>

      <OnboardingWizard
        userId={user.id}
        restaurantId={membership?.restaurantId ?? ""}
        restaurantName={restaurant?.name ?? "Minerva Flow"}
        initialFullName={profile?.fullName ?? ""}
        initialAvatarUrl={profile?.avatarUrl ?? null}
        initialRole={membership?.role ?? "owner"}
      />
    </div>
  );
}

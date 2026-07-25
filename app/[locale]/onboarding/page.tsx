import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/profile";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { LogoMark } from "@/components/shell/Logo";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OriginRightPanel } from "@/components/auth/AuthCard";

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
    <div className="flex min-h-screen w-full bg-white">
      {/* ── LEFT PANEL: Onboarding Wizard Full Screen Edge-to-Edge (55% width) ── */}
      <div className="flex w-full flex-col justify-between p-8 sm:p-12 lg:w-[55%] xl:w-[50%] lg:p-16">
        {/* Header Logo */}
        <div className="flex items-center gap-3">
          <LogoMark size={28} />
          <div className="flex flex-col leading-tight">
            <span className="font-sans text-[15px] font-bold text-mv-ink leading-none">Minerva Flow</span>
            <span className="text-[10px] font-semibold text-mv-ink-soft leading-none mt-0.5">par Minerva</span>
          </div>
        </div>

        {/* Onboarding Wizard Component */}
        <div className="my-auto w-full max-w-lg mx-auto py-8">
          <OnboardingWizard
            userId={user.id}
            restaurantId={membership?.restaurantId ?? ""}
            restaurantName={restaurant?.name ?? "Flow par Minerva"}
            initialFullName={profile?.fullName ?? ""}
            initialAvatarUrl={profile?.avatarUrl ?? null}
            initialRole={membership?.role ?? "owner"}
          />
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-mv-ink-faint">
          Besoin d&apos;assistance ? Contactez le support à tout moment depuis l&apos;application.
        </p>
      </div>

      {/* ── RIGHT PANEL: Origin Style Space/Night Graphic Edge-to-Edge (45-50% width) ── */}
      <div className="hidden lg:block lg:w-[45%] xl:w-[50%]">
        <OriginRightPanel />
      </div>
    </div>
  );
}

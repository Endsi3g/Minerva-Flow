import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/profile";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { MeshDriftBackground } from "@/components/ui/MeshDriftBackground";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step } = await searchParams;
  const initialStep = step ? parseInt(step, 10) : 1;

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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden text-white">
      {/* Animated WebGL Mesh Drift Background */}
      <MeshDriftBackground />

      {/* Main Solid Opaque Container (Strictly NO Glassmorphism) */}
      <div className="w-full max-w-xl my-auto z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Solid Opaque Card */}
        <div className="bg-[#181816] border border-[#2E2E2A] rounded-3xl p-6 sm:p-9 shadow-[0_24px_70px_rgba(0,0,0,0.85)]">
          
          {/* Header Logo & Title */}
          <div className="flex items-center justify-between border-b border-[#2E2E2A] pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0E7C5A] text-white font-serif font-bold text-base shadow-sm border border-[#7CE577]/30">
                M
              </div>
              <div>
                <h1 className="font-serif text-lg font-bold text-[#F4FFC7] leading-none">
                  Minerva Flow
                </h1>
                <p className="text-[11px] text-[#A8A7A0] mt-0.5">Configuration de l&apos;établissement</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#7CE577] bg-[#0E7C5A]/20 border border-[#7CE577]/30 px-2 py-0.5 rounded-full uppercase">
              Étape par étape
            </span>
          </div>

          {/* Onboarding Wizard Component */}
          <div className="w-full">
            <OnboardingWizard
              userId={user.id}
              restaurantId={membership?.restaurantId ?? ""}
              restaurantName={restaurant?.name ?? "Flow par Minerva"}
              initialFullName={profile?.fullName ?? ""}
              initialAvatarUrl={profile?.avatarUrl ?? null}
              initialRole={membership?.role ?? "owner"}
              initialStep={isNaN(initialStep) ? 1 : initialStep}
            />
          </div>
        </div>

        {/* Footer Support Note */}
        <p className="mt-4 text-center text-[11px] text-white/50">
          Besoin d&apos;aide lors de la configuration ? L&apos;équipe Minerva reste disponible à tout moment.
        </p>
      </div>
    </div>
  );
}

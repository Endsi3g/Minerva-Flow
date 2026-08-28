import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/profile";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { LogoMark } from "@/components/shell/Logo";
import { MeshDriftBackground } from "@/components/ui/MeshDriftBackground";
import Link from "next/link";

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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden text-[#1F1E1D]">
      {/* Soft Emerald WebGL Mesh Drift Shader Background */}
      <MeshDriftBackground variant="soft-emerald" />

      <div className="w-full max-w-xl my-auto z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Solid White Card with Emerald Double-Border */}
        <div className="bg-white border-2 border-[#0E7C5A]/30 rounded-3xl p-6 sm:p-9 shadow-[0_16px_50px_rgba(14,124,90,0.12),0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-[#0E7C5A]/20">
          
          {/* Header Logo & Title */}
          <div className="flex items-center justify-between border-b border-[#F0EFEA] pb-5 mb-6">
            <Link href="/overview" className="flex items-center gap-3 group">
              <div className="flex items-center justify-center p-1.5 rounded-xl bg-[#0E7C5A]/10 border border-[#0E7C5A]/25 shadow-xs group-hover:scale-105 transition-transform">
                <LogoMark size={30} />
              </div>
              <div>
                <h1 className="font-serif text-lg font-bold text-[#0A3F2F] leading-none group-hover:text-[#0E7C5A] transition-colors">
                  Minerva Flow
                </h1>
                <p className="text-[11px] text-[#8A887F] mt-0.5">Configuration de l&apos;établissement</p>
              </div>
            </Link>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#0E7C5A] bg-[#0E7C5A]/10 border border-[#0E7C5A]/20 px-2.5 py-0.5 rounded-full uppercase">
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
        <p className="mt-4 text-center text-[11px] text-[#8A887F]">
          Besoin d&apos;aide lors de la configuration ? L&apos;équipe Minerva reste disponible à tout moment.
        </p>
      </div>
    </div>
  );
}

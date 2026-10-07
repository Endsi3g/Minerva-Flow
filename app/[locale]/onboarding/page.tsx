import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/profile";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getCustomersForUser } from "@/lib/data/customer-portal";
import { shouldRedirectCustomerToPortal } from "@/lib/auth/customer-entry";
import { isPlatformAdmin } from "@/lib/data/admin";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AuthShell } from "@/components/auth/AuthShell";
import { isGooglePlacesConfigured } from "@/lib/google/config";

function buildONBOARDING_PANEL_POINTS(t: (key: string) => string) {
  return [
  { title: t("noCardRequired"), description: t("youEnterTheApp") },
  { title: t("nothingIsSetIn"), description: t("nameAddressTeamConnected") },
  { title: t("yourDataStaysYours"), description: "Hébergées au Canada, jamais revendues, exportables en un clic si vous partez un jour." },
];
}

export default async function OnboardingPage() {
  const t = await getTranslations("onboardingPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileRow, membership, platformAdmin] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle(),
    getCurrentMembership(),
    isPlatformAdmin(),
  ]);

  if (!membership && !platformAdmin) {
    const customers = await getCustomersForUser(user.id).catch(() => []);
    if (shouldRedirectCustomerToPortal({
      isAuthenticated: true,
      hasRestaurantMembership: false,
      isPlatformAdmin: platformAdmin,
      customerRecordCount: customers.length,
    })) {
      redirect("/portal");
    }
  }

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
      panelHeadline={t("almostReadyLetS")}
      panelSubline={t("theRestAddressKey")}
      panelPoints={buildONBOARDING_PANEL_POINTS(t)}
      footer={
        <p className="text-center text-[12px] text-mv-ink-faint">
          {t("needHelpTheMinerva")}
        </p>
      }
    >
      <OnboardingWizard
        userId={user.id}
        googlePlacesEnabled={isGooglePlacesConfigured()}
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

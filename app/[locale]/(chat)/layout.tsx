import { redirect } from "next/navigation";
import { AppProvider } from "@/lib/app-context";
import { getAppSessionData } from "@/lib/data/session";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { PostHogIdentifier } from "@/components/PostHogIdentifier";
import { brandingCssVariables } from "@/lib/branding/workspace-branding";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["owner", "manager", "staff", "consultant"];

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { authUser, restaurants, branding, role, sidebarPermissions, isPlatformAdmin, initialRestaurantId, onboardingCompleted } =
    await getAppSessionData();

  if (!authUser || !ALLOWED_ROLES.includes(role)) {
    redirect("/overview");
  }

  if (!onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppProvider
      authUser={authUser}
      role={role}
      sidebarPermissions={sidebarPermissions}
      isPlatformAdmin={isPlatformAdmin}
      restaurants={restaurants}
      branding={branding}
      initialRestaurantId={initialRestaurantId}
    >
      <PostHogIdentifier authUser={authUser} />
      <div className="mv-brand-scope h-screen w-full overflow-hidden bg-mv-cream pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0" style={brandingCssVariables(branding)}>{children}</div>
      <MobileTabBar />
    </AppProvider>
  );
}

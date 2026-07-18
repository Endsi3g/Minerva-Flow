import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/shell/AppShell";
import { PostHogIdentifier } from "@/components/PostHogIdentifier";
import { getAppSessionData } from "@/lib/data/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, restaurants, role, sidebarPermissions, initialRestaurantId, onboardingCompleted } =
    await getAppSessionData();

  if (authUser && !onboardingCompleted) {
    redirect({ href: "/onboarding", locale: await getLocale() });
  }

  return (
    <AppProvider
      authUser={authUser}
      role={role}
      sidebarPermissions={sidebarPermissions}
      restaurants={restaurants}
      initialRestaurantId={initialRestaurantId}
    >
      <PostHogIdentifier authUser={authUser} />
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}

import { redirect } from "next/navigation";
import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/shell/AppShell";
import { PostHogIdentifier } from "@/components/PostHogIdentifier";
import { getAppSessionData } from "@/lib/data/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, restaurants, role, sidebarPermissions, initialRestaurantId, onboardingCompleted } =
    await getAppSessionData();

  if (authUser && !onboardingCompleted) {
    redirect("/onboarding");
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

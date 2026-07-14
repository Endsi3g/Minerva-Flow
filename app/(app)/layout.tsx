import { redirect } from "next/navigation";
import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/shell/AppShell";
import { getAppSessionData } from "@/lib/data/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, restaurants, role, initialRestaurantId, onboardingCompleted } =
    await getAppSessionData();

  if (authUser && !onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppProvider
      authUser={authUser}
      role={role}
      restaurants={restaurants}
      initialRestaurantId={initialRestaurantId}
    >
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}

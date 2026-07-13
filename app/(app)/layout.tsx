import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/shell/AppShell";
import { getAppSessionData } from "@/lib/data/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, restaurants, role, initialRestaurantId } = await getAppSessionData();

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

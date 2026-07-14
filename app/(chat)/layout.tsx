import { redirect } from "next/navigation";
import { AppProvider } from "@/lib/app-context";
import { getAppSessionData } from "@/lib/data/session";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["owner", "manager", "staff", "consultant"];

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { authUser, restaurants, role, initialRestaurantId } = await getAppSessionData();

  if (!authUser || !ALLOWED_ROLES.includes(role)) {
    redirect("/overview");
  }

  return (
    <AppProvider
      authUser={authUser}
      role={role}
      restaurants={restaurants}
      initialRestaurantId={initialRestaurantId}
    >
      <div className="h-screen w-full overflow-hidden bg-mv-cream pb-16 md:pb-0">{children}</div>
      <MobileTabBar />
    </AppProvider>
  );
}

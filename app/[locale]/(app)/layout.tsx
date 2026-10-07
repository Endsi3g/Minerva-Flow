import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/shell/AppShell";
import { PostHogIdentifier } from "@/components/PostHogIdentifier";
import { DemoGuideTour } from "@/components/demo/DemoGuideTour";
import { getAppSessionData } from "@/lib/data/session";
import { getCustomersForUser } from "@/lib/data/customer-portal";
import { shouldRedirectCustomerToPortal } from "@/lib/auth/customer-entry";

// Private dashboard pages must never appear in search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, restaurants, workspaces, branding, role, sidebarPermissions, isPlatformAdmin, initialRestaurantId, onboardingCompleted } =
    await getAppSessionData();

  // Resolve customer access before the restaurant onboarding guard. A customer
  // can have an incomplete profile but already have a restaurant relationship;
  // sending them to onboarding would create the login → onboarding → login loop.
  if (authUser && restaurants.length === 0 && !isPlatformAdmin) {
    const customers = await getCustomersForUser(authUser.id).catch(() => []);
    if (shouldRedirectCustomerToPortal({
      isAuthenticated: true,
      hasRestaurantMembership: false,
      isPlatformAdmin,
      customerRecordCount: customers.length,
    })) {
      redirect({ href: "/portal", locale: await getLocale() });
    }
  }

  if (authUser && !onboardingCompleted) {
    redirect({ href: "/onboarding", locale: await getLocale() });
  }

  return (
    <AppProvider
      authUser={authUser}
      role={role}
      sidebarPermissions={sidebarPermissions}
      isPlatformAdmin={isPlatformAdmin}
      restaurants={restaurants}
      workspaces={workspaces}
      branding={branding}
      initialRestaurantId={initialRestaurantId}
    >
      <PostHogIdentifier authUser={authUser} />
      <DemoGuideTour authUser={authUser} />
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}

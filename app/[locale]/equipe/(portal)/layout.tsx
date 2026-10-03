import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { TeamPortalShell } from "@/components/team-portal/TeamPortalShell";

/**
 * Deliberately its own gate, not a reuse of (app)/layout.tsx's
 * getAppSessionData — a team/ambassador account has no restaurant
 * membership to resolve, and must never fall into that flow by accident.
 */
export default async function TeamPortalLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const access = await getTeamPortalAccess();

  if (!access) {
    // next-intl's redirect() only localizes a bare pathname; the denial
    // reason needs a query string, so this one case uses the raw
    // next/navigation redirect with the locale prefix built in by hand.
    redirect(`/${locale}/equipe/connexion?error=unauthorized`);
  }

  return <TeamPortalShell access={access}>{children}</TeamPortalShell>;
}

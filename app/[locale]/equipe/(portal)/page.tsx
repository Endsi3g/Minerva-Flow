import type { Metadata } from "next";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { getTeamMetricsSnapshot } from "@/lib/data/team-metrics";
import { TeamPortalHomeContent } from "@/components/team-portal/TeamPortalHomeContent";
import { TeamMetricsDashboard } from "@/components/team-portal/TeamMetricsDashboard";

export const metadata: Metadata = { title: "Espace équipe — Minerva Flow" };

export default async function TeamPortalHomePage() {
  // The layout above already redirects when access is null — safe to
  // assume a value here, this just reads it again for the greeting copy.
  const access = await getTeamPortalAccess();
  // Null for ambassadors by design (checked again inside the function):
  // revenue/churn are internal financials, never shown to non-employees.
  const metrics = access?.isTeamMember ? await getTeamMetricsSnapshot() : null;

  return (
    <TeamPortalHomeContent
      isTeamMember={access?.isTeamMember ?? false}
      firstName={access?.firstName ?? null}
      dashboard={metrics ? <TeamMetricsDashboard metrics={metrics} /> : null}
    />
  );
}

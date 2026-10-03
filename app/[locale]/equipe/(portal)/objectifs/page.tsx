import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { getTeamMetricsSnapshot } from "@/lib/data/team-metrics";
import { readGoalsSnapshot } from "@/lib/data/team-goals";
import { GoalsBoard } from "@/components/team-portal/GoalsBoard";

export const metadata: Metadata = { title: "Objectifs du mois — Minerva Flow" };

export default async function TeamGoalsPage() {
  const locale = await getLocale();
  const access = await getTeamPortalAccess();
  // Revenue targets are internal: ambassadors are sent back to the home.
  // (next/navigation's redirect returns `never`, so `metrics` narrows below.)
  if (!access?.isTeamMember) redirect(`/${locale}/equipe`);

  const metrics = await getTeamMetricsSnapshot();
  if (!metrics) redirect(`/${locale}/equipe`);

  const supabase = await createClient();
  const goals = await readGoalsSnapshot(supabase, metrics);

  return <GoalsBoard goals={goals} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { getTeamDirectory } from "@/lib/data/team-members";
import { MemberDirectory } from "@/components/team-portal/MemberDirectory";

export const metadata: Metadata = { title: "Membres — Minerva Flow" };

export default async function MembersPage() {
  const locale = await getLocale();
  const access = await getTeamPortalAccess();
  // Ambassadors don't see the team directory (nor each other).
  if (!access?.isTeamMember) redirect(`/${locale}/equipe`);

  const members = await getTeamDirectory(access);
  if (!members) redirect(`/${locale}/equipe`);

  return <MemberDirectory members={members} currentUserId={access.userId} />;
}

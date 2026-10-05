import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { getMemberProfile } from "@/lib/data/team-members";
import { MemberProfileView } from "@/components/team-portal/MemberProfileView";

export const metadata: Metadata = { title: "Profil — Minerva Flow" };

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getTeamPortalAccess();
  if (!access) notFound();

  // Employees: any employee profile. Ambassadors: only their own ("me" or their id).
  const profile = await getMemberProfile(access, id);
  if (!profile) notFound();

  return <MemberProfileView profile={profile} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { ACADEMY_PAGES, getAcademyPage } from "@/lib/data/team-academy";
import { AcademyPageView } from "@/components/team-portal/AcademyPageView";

export function generateStaticParams() {
  return ACADEMY_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = ACADEMY_PAGES.find((p) => p.slug === slug);
  return { title: page ? `${page.title} — Académie Minerva Flow` : "Académie — Minerva Flow" };
}

export default async function AcademyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // The layout already guarantees access; teamOnly sections are filtered
  // here per role so ambassadors never receive them in the page payload.
  const access = await getTeamPortalAccess();
  const page = getAcademyPage(slug, access?.isTeamMember ?? false);
  if (!page) notFound();
  return <AcademyPageView page={page} />;
}

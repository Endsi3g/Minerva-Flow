import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getChangelogEntries } from "@/lib/data/changelog";
import { ChangelogView } from "@/components/minerva/ChangelogView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("changelog") };
}

export default async function ChangelogPage() {
  const entries = await getChangelogEntries();

  return <ChangelogView initialEntries={entries} />;
}

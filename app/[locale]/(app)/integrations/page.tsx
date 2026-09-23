import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("integrations") };
}

export default async function IntegrationsPage() {
  redirect("/settings?tab=integrations");
}

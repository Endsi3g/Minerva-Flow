import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("finance") };
}

// Finance is retired — hidden from navigation and unreachable directly.
// The underlying data layer (lib/data/finance.ts) stays: Reports, the LTV
// & CAC page and purchase-order expense logging all still read/write it.
export default async function FinancePage() {
  redirect({ href: "/workspace", locale: await getLocale() });
}

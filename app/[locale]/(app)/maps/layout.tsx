import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// page.tsx is a client component (interactive map, can't export
// generateMetadata itself) — the browser tab title fell back to the app's
// generic default forever. This is the minimal fix: a layout that only
// supplies metadata, same breadcrumb-sourced title as every other page.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("maps") };
}

export default function MapsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

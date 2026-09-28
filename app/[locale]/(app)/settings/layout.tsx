import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { canAccessSettings } from "@/lib/nav-items";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const membership = await getCurrentMembership();
  if (!membership || !canAccessSettings(membership.role)) {
    redirect({ href: "/workspace", locale: await getLocale() });
  }

  return children;
}

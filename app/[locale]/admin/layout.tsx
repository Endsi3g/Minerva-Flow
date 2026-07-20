import { redirect } from "@/i18n/navigation";
import { isPlatformAdmin } from "@/lib/data/admin";
import { LogoMark } from "@/components/shell/Logo";
import { Link } from "@/i18n/navigation";
import { Shield } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) redirect({ href: "/overview", locale: await getLocale() });

  const t = await getTranslations("admin.layout");

  return (
    <div className="min-h-screen bg-mv-cream">
      <header className="flex h-14 items-center justify-between border-b border-mv-border bg-mv-cream-soft px-5">
        <div className="flex items-center gap-6">
          <Link href="/admin/restaurants" className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-mv-ink">
              <Shield size={13} className="text-mv-green-dark" /> {t("title")}
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-[13px] font-medium text-mv-ink-soft">
            <Link href="/admin/restaurants" className="hover:text-mv-ink">
              {t("navRestaurants")}
            </Link>
            <Link href="/admin/pilots" className="hover:text-mv-ink">
              {t("navPilots")}
            </Link>
            <Link href="/admin/support" className="hover:text-mv-ink">
              {t("navSupport")}
            </Link>
            <Link href="/admin/incidents" className="hover:text-mv-ink">
              {t("navIncidents")}
            </Link>
            <Link href="/admin/analytics" className="hover:text-mv-ink">
              {t("navAnalytics")}
            </Link>
            <Link href="/admin/changelog" className="hover:text-mv-ink">
              {t("navChangelog")}
            </Link>
          </nav>
        </div>
        <Link href="/overview" className="text-[12.5px] font-medium text-mv-ink-faint hover:text-mv-ink">
          {t("backToApp")}
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type StudioPage = "menu" | "design" | "qr" | "settings";

const hrefByPage: Record<StudioPage, string> = {
  menu: "/menu",
  design: "/menu/design",
  qr: "/menu/qr",
  settings: "/menu/settings",
};

export function MenuStudioNav({ active }: { active: StudioPage }) {
  const t = useTranslations("menu.studioNav");
  const pages: StudioPage[] = ["menu", "design", "qr", "settings"];

  return (
    <nav aria-label={t("navLabel")} className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {pages.map((page) => (
        <Link
          key={page}
          href={hrefByPage[page]}
          aria-current={active === page ? "page" : undefined}
          className={cn(
            "rounded-xl border p-3 transition-colors",
            active === page
              ? "border-mv-green/30 bg-mv-green-tint/60 text-mv-green-dark"
              : "border-mv-border-soft bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft hover:text-mv-ink"
          )}
        >
          <span className="block text-[12.5px] font-semibold">{t(`${page}Label`)}</span>
          <span className="mt-1 block text-[12px] leading-relaxed text-mv-ink-faint">{t(`${page}Description`)}</span>
        </Link>
      ))}
    </nav>
  );
}

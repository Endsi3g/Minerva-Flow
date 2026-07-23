"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { reportDefs } from "@/lib/reports";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

const crumbTranslationKeys: Record<string, string> = {
  overview: "overview",
  programs: "programs",
  days: "days",
  finance: "finance",
  campaigns: "campaigns",
  maps: "maps",
  settings: "settings",
  reports: "reports",
  assistant: "assistant",
  fidelisation: "fidelisation",
  menu: "menu",
  inventaire: "inventaire",
  commandes: "commandes",
  collaborateurs: "collaborateurs",
  incidents: "incidents",
};

export function AppBreadcrumb() {
  const t = useTranslations("breadcrumb");
  const tReports = useTranslations("reports");
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] === "overview") {
    return (
      <Breadcrumb aria-label="Fil d'Ariane">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1 text-[12.5px] font-medium tracking-normal text-mv-ink">
              {t("overview")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Handle nested routes e.g. /reports/seuil-rentabilite or /collaborateurs/usr-101
  return (
    <Breadcrumb aria-label="Fil d'Ariane">
      <BreadcrumbList className="flex items-center gap-1.5 text-[12.5px] text-mv-ink-soft">
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/overview" />} className="font-normal text-mv-ink-soft hover:text-mv-ink transition-colors">
            {t("overview")}
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/${segments.slice(0, index + 1).join("/")}`;

          let displayLabel = crumbTranslationKeys[segment] ? t(crumbTranslationKeys[segment]) : segment;

          if (segments[0] === "reports" && index === 1) {
            const report = reportDefs.find((r) => r.slug === segment);
            displayLabel = report ? tReports(`labels.${report.slug}`) : segment;
          }

          return (
            <div key={href} className="flex items-center gap-1.5">
              <BreadcrumbSeparator className="text-mv-ink-faint">
                <ChevronRight size={13} />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="line-clamp-1 font-medium text-mv-ink max-w-[180px] sm:max-w-[280px]">
                    {displayLabel}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={href as any} />} className="font-normal text-mv-ink-soft hover:text-mv-ink transition-colors">
                    {displayLabel}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

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
};

export function AppBreadcrumb() {
  const t = useTranslations("breadcrumb");
  const tReports = useTranslations("reports");
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <BreadcrumbRoot label={t("overview")} />;
  }

  if (segments[0] === "reports" && segments[1]) {
    const report = reportDefs.find((r) => r.slug === segments[1]);
    return (
      <Breadcrumb>
        <BreadcrumbList className="[&_*]:uppercase [&_*]:tracking-wide">
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/overview" />} className="text-[13px] font-semibold">
              {t("reports")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1 text-[13px] font-semibold text-mv-ink">
              {report ? tReports(`labels.${report.slug}`) : segments[1]}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const translationKey = crumbTranslationKeys[segments[0]];
  const label = translationKey ? t(translationKey) : segments[0];
  return <BreadcrumbRoot label={label} />;
}

function BreadcrumbRoot({ label }: { label: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage className="line-clamp-1 text-[13px] font-semibold uppercase tracking-wide text-mv-ink">
            {label}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

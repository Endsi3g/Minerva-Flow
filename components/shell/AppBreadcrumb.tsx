"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getReport } from "@/lib/reports";
import { usePathname } from "next/navigation";
import Link from "next/link";

const crumbLabels: Record<string, string> = {
  overview: "Aperçu",
  programs: "Programmes",
  days: "Journées",
  finance: "Finance",
  campaigns: "Campagnes",
  maps: "Cartes",
  settings: "Paramètres",
  reports: "Métriques",
  assistant: "Assistant",
};

export function AppBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <BreadcrumbRoot label="Aperçu" />;
  }

  if (segments[0] === "reports" && segments[1]) {
    const report = getReport(segments[1]);
    return (
      <Breadcrumb>
        <BreadcrumbList className="[&_*]:uppercase [&_*]:tracking-wide">
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/overview" />} className="text-[13px] font-semibold">
              Métriques
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1 text-[13px] font-semibold text-mv-ink">
              {report?.label ?? segments[1]}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const label = crumbLabels[segments[0]] ?? segments[0];
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

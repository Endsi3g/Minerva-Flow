"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";

const crumbLabels: Record<string, string> = {
  overview: "Overview",
  programs: "Programs",
  days: "Days",
  finance: "Finance",
  campaigns: "Campaigns",
  maps: "Maps",
  settings: "Settings",
  reports: "Reports",
};

export function AppBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  const label = crumbLabels[last] ?? (segments.length ? last : "Overview");

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage className="line-clamp-1 font-semibold text-mv-ink">
            {label}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

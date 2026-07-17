"use client";

import { AppSidebar } from "@/components/shell/AppSidebar";
import { AppBreadcrumb } from "@/components/shell/AppBreadcrumb";
import { TopbarActions } from "@/components/shell/TopbarActions";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { WorkspaceSetupBanner } from "@/components/shell/WorkspaceSetupBanner";
import { UpdateBanner } from "@/components/shell/UpdateBanner";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";

// Full-bleed routes render edge-to-edge, without the shared page padding/max-width.
const FULL_BLEED_ROUTES = ["/maps"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const pathname = usePathname();
  const isFullBleed = FULL_BLEED_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-mv-cream">
      <div className="no-print hidden md:flex">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-16 shrink-0 items-center justify-between gap-4 border-b border-mv-border bg-mv-cream-soft px-4">
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Basculer la navigation"
              title={sidebarCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            >
              <PanelLeft size={16} />
            </button>
            <div className="mr-1 h-5 w-px bg-mv-border" />
            <AppBreadcrumb />
          </div>
          <div className="md:hidden">
            <AppBreadcrumb />
          </div>
          <TopbarActions />
        </header>
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            isFullBleed
              ? "flex flex-col pb-[calc(4rem+24px+env(safe-area-inset-bottom))] md:pb-0"
              : "px-6 pt-6 pb-[calc(4rem+24px+env(safe-area-inset-bottom))] md:pb-6 lg:px-8 lg:pt-7 lg:pb-7"
          )}
        >
          {isFullBleed ? (
            children
          ) : (
            <div className={cn("mx-auto", sidebarCollapsed ? "max-w-[1800px]" : "max-w-[1600px]")}>
              {!pathname.startsWith("/changelog") && <UpdateBanner />}
              {!pathname.startsWith("/etablissement") && <WorkspaceSetupBanner />}
              {children}
            </div>
          )}
        </main>
      </div>
      <div className="no-print">
        <MobileTabBar />
      </div>
    </div>
  );
}

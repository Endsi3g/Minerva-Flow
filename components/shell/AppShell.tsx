"use client";

import { AppSidebar } from "@/components/shell/AppSidebar";
import { AppBreadcrumb } from "@/components/shell/AppBreadcrumb";
import { TopbarActions } from "@/components/shell/TopbarActions";
import { useApp } from "@/lib/app-context";
import { PanelLeft } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-mv-cream">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-mv-border bg-mv-cream-soft px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Basculer la navigation"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            >
              <PanelLeft size={16} />
            </button>
            <div className="mr-1 h-5 w-px bg-mv-border" />
            <AppBreadcrumb />
          </div>
          <TopbarActions />
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

import { AppProvider } from "@/lib/app-context";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { AppBreadcrumb } from "@/components/shell/AppBreadcrumb";
import { TopbarActions } from "@/components/shell/TopbarActions";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authUser = user
    ? {
        id: user.id,
        email: user.email ?? "",
        fullName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "",
      }
    : null;

  return (
    <AppProvider authUser={authUser}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-mv-cream">
          <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-mv-border bg-mv-cream-soft px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-1 data-vertical:h-5" />
              <AppBreadcrumb />
            </div>
            <TopbarActions />
          </header>
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AppProvider>
  );
}

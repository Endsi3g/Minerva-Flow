import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/shell/AppShell";
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
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}

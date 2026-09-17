import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasAuthCookies = cookieStore.getAll().some((c) => c.name.startsWith("sb-") || c.name.includes("auth-token"));

  if (!hasAuthCookies) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/overview" : "/login");
}

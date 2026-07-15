import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * No public landing page for now (the marketing version was pulled — see
 * docs/landing-page-copywriting-brief.md for the brief to rebuild it
 * properly once real copy exists). "/" just routes straight to the right
 * place depending on auth state instead of bouncing through /overview
 * first.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/overview" : "/login");
}

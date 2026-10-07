"use client";

import { createClient } from "@/lib/supabase/client";
import { getPathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { LogOut } from "lucide-react";

export function TeamPortalSignOutButton() {
  const locale = useLocale();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign(getPathname({ href: "/equipe/connexion", locale }));
  }

  return (
    <button
      type="button"
      aria-label="Se déconnecter"
      title="Se déconnecter"
      onClick={handleSignOut}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-[12.5px] font-medium text-mv-ink-faint hover:text-mv-ink"
    >
      <LogOut size={16} aria-hidden="true" className="lg:hidden" />
      <span className="hidden lg:inline">Se déconnecter</span>
    </button>
  );
}

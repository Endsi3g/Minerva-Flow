"use client";

import { createClient } from "@/lib/supabase/client";
import { getPathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";

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
      onClick={handleSignOut}
      className="text-[12.5px] font-medium text-mv-ink-faint hover:text-mv-ink"
    >
      Se déconnecter
    </button>
  );
}

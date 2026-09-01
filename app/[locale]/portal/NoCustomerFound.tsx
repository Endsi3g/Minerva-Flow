"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Reached when a valid, signed-in Supabase Auth session has no matching
 * customer record at this restaurant — most often because the visitor is
 * already signed in as staff/owner in the same browser (one Supabase Auth
 * session covers both the dashboard and the customer portal), not because
 * they genuinely have no loyalty account. Previously this dead-ended with no
 * way forward; signing out and sending them to the customer magic-link login
 * lets them actually authenticate as the customer.
 */
export function NoCustomerFoundActions() {
  const t = useTranslations("portal.page");
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSwitchAccount() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/portal/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSwitchAccount}
      disabled={signingOut}
      className="mt-4 text-[12.5px] font-semibold text-mv-green-dark underline decoration-mv-green-dark/40 underline-offset-2 hover:text-mv-green-darker"
    >
      {signingOut ? t("switchingAccount") : t("signInDifferentEmail")}
    </button>
  );
}

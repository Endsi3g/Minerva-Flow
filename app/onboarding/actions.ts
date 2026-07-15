"use server";

import { completeOnboarding, updateMyRole } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { activateReferral } from "@/lib/data/referrals";
import type { Role } from "@/lib/types";

/**
 * Best-effort — see updateMyRole()'s doc comment. A failed role update
 * never blocks the wizard from proceeding.
 */
export async function setMyRoleAction(restaurantId: string, role: Role): Promise<void> {
  await updateMyRole(restaurantId, role);
}

/**
 * Deliberately doesn't redirect() itself — this is called as a bare async
 * function from a client component (not a <form action>), and the caller
 * navigates via router.push() once this resolves so it can also flip local
 * submitting state without racing a server-thrown redirect.
 */
export async function finishOnboardingAction(): Promise<boolean> {
  const ok = await completeOnboarding();
  if (ok) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const posthog = getPostHogClient();
      posthog.capture({ distinctId: user.id, event: "onboarding_completed" });
      await posthog.flush();

      const referralCode = user.user_metadata?.referral_code as string | undefined;
      if (referralCode && user.email) {
        const restaurantId = await getCurrentRestaurantId();
        if (restaurantId) await activateReferral(referralCode, user.email, restaurantId);
      }
    }
  }
  return ok;
}

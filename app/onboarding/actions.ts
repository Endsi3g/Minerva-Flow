"use server";

import { completeOnboarding, updateMyRole } from "@/lib/data/profile";
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
  return completeOnboarding();
}

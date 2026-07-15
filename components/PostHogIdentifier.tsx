"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import type { AuthUser } from "@/lib/app-context";

export function PostHogIdentifier({ authUser }: { authUser: AuthUser | null }) {
  useEffect(() => {
    if (authUser) {
      posthog.identify(authUser.id, { name: authUser.fullName });
    }
  }, [authUser]);

  return null;
}

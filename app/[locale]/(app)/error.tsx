"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

/**
 * Backstop for the (app) route group — catches errors thrown while
 * resolving the session/workspace (see lib/data/session.ts, restaurants.ts,
 * current-restaurant.ts) after their built-in retries are exhausted. Without
 * this, Next.js falls back to its generic unstyled error page instead of a
 * "try again" the user can actually act on.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <EmptyState
        icon={AlertTriangle}
        title="Un problème temporaire est survenu"
        description="Votre compte et vos données n'ont pas bougé — il s'agit probablement d'un blip réseau. Réessayez."
        action={
          <Button size="sm" onClick={reset}>
            Réessayer
          </Button>
        }
      />
    </div>
  );
}

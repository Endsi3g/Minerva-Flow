"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { reportClientError } from "@/lib/alerts/client-reporter";
import Link from "next/link";

/**
 * Backstop for the (app) route group — catches errors thrown while
 * resolving the session/workspace (see lib/data/session.ts, restaurants.ts,
 * current-restaurant.ts) after their built-in retries are exhausted. Without
 * this, Next.js falls back to its generic unstyled error page instead of a
 * "try again" the user can actually act on.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError caught]:", error);
    Sentry.captureException(error);
    reportClientError(error, "app_route_group");
  }, [error]);

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-mv-border bg-mv-surface p-8 shadow-sm text-center">
        <EmptyState
          icon={AlertTriangle}
          title="Un problème temporaire est survenu"
          description="Votre compte et vos données n'ont pas bougé — il s'agit probablement d'un blip de connexion. Notre équipe d'ingénierie a été alertée."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <Button size="sm" onClick={reset} className="bg-mv-green text-white hover:bg-mv-green-dark">
                Réessayer
              </Button>
              <Button href="/overview" size="sm" variant="outline" className="border-mv-border text-mv-ink">
                Retour au tableau de bord
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}


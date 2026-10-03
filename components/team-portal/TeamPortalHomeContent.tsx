"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { TeamOnboardingIntro, hasSeenTeamOnboardingIntro } from "./TeamOnboardingIntro";

// localStorage is the external system; nothing else writes it while this
// page is mounted (the intro's own dismiss drives `dismissed` below), so
// there is nothing to subscribe to.
const subscribe = () => () => {};
const readSeen = (): boolean | null => hasSeenTeamOnboardingIntro();
// null on the server (unknown) so a new visitor never sees the page flash
// before the intro takes over.
const readSeenOnServer = (): boolean | null => null;

export function TeamPortalHomeContent({
  isTeamMember,
  firstName,
  dashboard,
}: {
  isTeamMember: boolean;
  firstName: string | null;
  /** Server-rendered metrics dashboard — team members only (null for ambassadors). */
  dashboard: ReactNode;
}) {
  const seen = useSyncExternalStore(subscribe, readSeen, readSeenOnServer);
  const [dismissed, setDismissed] = useState(false);

  if (seen === null) return null;

  if (!seen && !dismissed) {
    return <TeamOnboardingIntro isTeamMember={isTeamMember} onDone={() => setDismissed(true)} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-mv-ink">
          {firstName ? `Bienvenue, ${firstName}` : "Bienvenue"}
        </h1>
        <p className="text-[13.5px] text-mv-ink-soft">
          {isTeamMember
            ? "Les indicateurs fondamentaux de Minerva Flow, en direct."
            : "Vos outils de parrainage arrivent dans la prochaine phase."}
        </p>
      </div>
      {dashboard}
    </div>
  );
}

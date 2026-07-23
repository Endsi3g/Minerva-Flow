import * as React from "react";
import { Progress, ProgressLabel, ProgressValue } from "minerva-flow";

export function Default() {
  return (
    <Progress value={62} className="w-[300px]">
      <ProgressLabel>Commande #1284 — en cuisine</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
}

// The indicator has no dedicated className prop of its own (Progress always
// mounts its own <ProgressTrack><ProgressIndicator /></ProgressTrack> below
// {children}, hardcoded to bg-primary) — the brand-green fill is applied by
// overriding the --primary CSS variable in scope via inline style, since
// bg-primary compiles to `background-color: var(--primary)` and custom
// properties cascade to descendants regardless of component boundaries.
export function OnTrack() {
  return (
    <Progress
      value={92}
      className="w-[300px]"
      style={{ ["--primary" as string]: "var(--mv-green)" }}
    >
      <ProgressLabel>Objectif de ventes du mois</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
}

export function Bare() {
  return <Progress value={40} className="w-[220px]" />;
}

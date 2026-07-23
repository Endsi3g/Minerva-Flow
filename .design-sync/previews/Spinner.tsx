import * as React from "react";
import { Spinner, Button } from "minerva-flow";

export function Default() {
  return <Spinner className="size-6 text-mv-ink-soft" />;
}

export function Sizes() {
  return (
    <div className="flex items-center gap-4">
      <Spinner className="size-4 text-mv-ink-soft" />
      <Spinner className="size-6 text-mv-ink-soft" />
      <Spinner className="size-8 text-mv-ink-soft" />
    </div>
  );
}

export function InButton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" disabled>
        <Spinner className="size-4" />
        Envoi de la commande…
      </Button>
      <Button variant="secondary" disabled>
        <Spinner className="size-4" />
        Chargement…
      </Button>
    </div>
  );
}

export function OnDark() {
  return (
    <div className="flex items-center justify-center rounded-lg bg-mv-ink p-6">
      <Spinner className="size-6 text-mv-cream-soft" />
    </div>
  );
}

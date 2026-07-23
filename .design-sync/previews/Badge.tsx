import * as React from "react";
import { Badge } from "minerva-flow";

export function Tones() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="green">Servi</Badge>
      <Badge tone="lime">Nouveau</Badge>
      <Badge tone="amber">En cuisine</Badge>
      <Badge tone="red">Annulé</Badge>
      <Badge tone="neutral">Brouillon</Badge>
      <Badge tone="ink">VIP</Badge>
    </div>
  );
}

export function WithDot() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="green" dot>
        Active
      </Badge>
      <Badge tone="amber" dot>
        En attente
      </Badge>
      <Badge tone="red" dot>
        En retard
      </Badge>
    </div>
  );
}

export function OrderStatuses() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-6">
        <span className="text-sm">Commande #1284 — Table 12</span>
        <Badge tone="amber" dot>
          En cuisine
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-sm">Commande #1283 — Table 6</span>
        <Badge tone="green" dot>
          Servi
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-sm">Commande #1281 — Pour emporter</span>
        <Badge tone="red" dot>
          Annulée
        </Badge>
      </div>
    </div>
  );
}

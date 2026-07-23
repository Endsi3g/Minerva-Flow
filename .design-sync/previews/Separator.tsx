import * as React from "react";
import { Separator, Badge } from "minerva-flow";

export function Horizontal() {
  return (
    <div className="flex w-[300px] flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Réservations aujourd'hui</p>
        <p className="text-sm text-mv-ink-soft">12 réservations · 3 en attente</p>
      </div>
      <Separator />
      <div>
        <p className="text-sm font-medium">Commandes en cours</p>
        <p className="text-sm text-mv-ink-soft">7 commandes · 84,50 $ moyen</p>
      </div>
    </div>
  );
}

export function Vertical() {
  return (
    <div className="flex h-8 items-center gap-3 text-sm">
      <span>Table 12</span>
      <Separator orientation="vertical" />
      <span>4 couverts</span>
      <Separator orientation="vertical" />
      <span className="font-medium">84,50 $</span>
    </div>
  );
}

export function InCard() {
  return (
    <div className="w-[320px] rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="font-heading text-base font-medium">Tarte au citron</p>
        <Badge tone="lime">Dessert</Badge>
      </div>
      <Separator className="my-3" />
      <p className="text-sm text-mv-ink-soft">11,00 $ · Sans gluten disponible</p>
    </div>
  );
}

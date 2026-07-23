import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  Button,
} from "minerva-flow";

// Base UI Sheet reuses the Dialog Root — no visible state by default —
// rendered with defaultOpen so the popup is statically visible for the
// screenshot, matching the app's own overlay usage patterns.

export function Default() {
  return (
    <Sheet defaultOpen modal={false}>
      <SheetContent side="right" className="w-[320px]">
        <SheetHeader>
          <SheetTitle>Détails de la commande #1284</SheetTitle>
          <SheetDescription>Table 12 · Ouverte il y a 18 minutes</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 text-sm text-mv-ink-soft">
          <div className="flex justify-between">
            <span>2× Tartare de saumon</span>
            <span>36,00 $</span>
          </div>
          <div className="flex justify-between">
            <span>1× Risotto aux champignons</span>
            <span>26,00 $</span>
          </div>
          <div className="flex justify-between">
            <span>1× Burger Minerva</span>
            <span>22,00 $</span>
          </div>
        </div>
        <SheetFooter>
          <Button className="w-full">Envoyer en cuisine</Button>
          <Button variant="outline" className="w-full">
            Fermer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function LeftNav() {
  return (
    <Sheet defaultOpen modal={false}>
      <SheetContent side="left" className="w-[280px]">
        <SheetHeader>
          <SheetTitle>Filtrer les réservations</SheetTitle>
          <SheetDescription>Aujourd'hui, 22 juillet</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1.5 px-4 text-sm">
          <span className="rounded-md bg-mv-green/10 px-2 py-1.5 font-medium text-mv-green-dark">
            Toutes (12)
          </span>
          <span className="px-2 py-1.5 text-mv-ink-soft">Confirmées (9)</span>
          <span className="px-2 py-1.5 text-mv-ink-soft">En attente (3)</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

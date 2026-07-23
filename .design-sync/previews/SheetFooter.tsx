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

// SheetFooter's mt-auto pin-to-bottom layout only makes sense inside a real
// open Sheet popup — composed here as its only true render (see
// design-sync's "compose context-required pieces" rule).

export function InSheet() {
  return (
    <Sheet defaultOpen modal={false}>
      <SheetContent side="right" className="w-[320px]">
        <SheetHeader>
          <SheetTitle>Nouvelle réservation</SheetTitle>
          <SheetDescription>Terrasse · Ce soir</SheetDescription>
        </SheetHeader>
        <div className="px-4 text-sm text-mv-ink-soft">
          4 personnes · 19 h 30 · Marie-Ève Tremblay
        </div>
        <SheetFooter>
          <Button className="w-full">Confirmer la réservation</Button>
          <Button variant="outline" className="w-full">
            Annuler
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

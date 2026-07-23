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

// SheetHeader's padding only reads correctly inside a real open Sheet
// popup — composed here as its only true render (see design-sync's
// "compose context-required pieces" rule).

export function InSheet() {
  return (
    <Sheet defaultOpen modal={false}>
      <SheetContent side="right" className="w-[320px]">
        <SheetHeader>
          <SheetTitle>Fiche employé — Sam Bouchard</SheetTitle>
          <SheetDescription>Serveur · Embauché le 4 mars 2024</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="outline" className="w-full">
            Fermer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

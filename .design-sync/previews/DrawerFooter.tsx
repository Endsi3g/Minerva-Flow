import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  Button,
} from "minerva-flow";

// DrawerFooter's mt-auto pin-to-bottom layout only makes sense inside a
// real open Drawer popup — composed here as its only true render (see
// design-sync's "compose context-required pieces" rule).

export function InDrawer() {
  return (
    <Drawer defaultOpen modal={false}>
      <DrawerContent className="w-[340px]">
        <DrawerHeader>
          <DrawerTitle>Annuler la commande #1291 ?</DrawerTitle>
          <DrawerDescription>Table 5 · 2 articles envoyés en cuisine</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="destructive" className="w-full">
            Annuler la commande
          </Button>
          <Button variant="outline" className="w-full">
            Garder la commande
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

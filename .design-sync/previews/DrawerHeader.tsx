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

// DrawerHeader's centered/text-align behaviour depends on the swipe-axis
// data attribute set by the real open Drawer popup — composed here as its
// only true render (see design-sync's "compose context-required pieces").

export function InDrawer() {
  return (
    <Drawer defaultOpen modal={false}>
      <DrawerContent className="w-[340px]">
        <DrawerHeader>
          <DrawerTitle>Plus d'options</DrawerTitle>
          <DrawerDescription>Employés, fournisseurs, finances</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="outline" className="w-full">
            Fermer
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

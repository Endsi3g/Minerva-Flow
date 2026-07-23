import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerSwipeHandle,
  Button,
} from "minerva-flow";

// Base UI Drawer has no visible state by default — rendered with defaultOpen
// so the popup is statically visible for the screenshot, matching the app's
// real usage in components/shell/MobileTabBar.tsx (bottom sheet, modal={false}
// here so the fixed overlay doesn't fight the capture harness's own layer).

export function Default() {
  return (
    <Drawer defaultOpen modal={false} showSwipeHandle>
      <DrawerContent className="w-[340px]">
        <DrawerSwipeHandle className="mx-auto mt-2" />
        <DrawerHeader>
          <DrawerTitle>Fermer le service du midi</DrawerTitle>
          <DrawerDescription>
            18 commandes complétées · 1 214,30 $ de ventes
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button className="w-full">Fermer le service</Button>
          <Button variant="outline" className="w-full">
            Annuler
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

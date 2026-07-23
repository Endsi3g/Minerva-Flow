import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "minerva-flow";

// AlertDialogHeader's centered/grid layout only makes sense inside the real
// open AlertDialogContent — composed here as its only true render (see
// design-sync's "compose context-required pieces" rule).

export function InAlertDialog() {
  return (
    <AlertDialog defaultOpen modal={false}>
      <AlertDialogContent className="w-[340px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Clore la caisse de la soirée ?</AlertDialogTitle>
          <AlertDialogDescription>
            Total perçu : 2 340,55 $ sur 3 services. Cette étape verrouille les
            transactions d'aujourd'hui.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Pas maintenant</AlertDialogCancel>
          <AlertDialogAction>Clore la caisse</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

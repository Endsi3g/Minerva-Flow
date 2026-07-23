import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogMedia,
  AlertDialogAction,
  AlertDialogCancel,
} from "minerva-flow";
import { Trash2 } from "lucide-react";

// AlertDialogMedia's row-span/icon-tile layout only resolves against the
// real AlertDialogHeader grid inside an open popup — composed here as its
// only true render (see design-sync's "compose context-required pieces").

export function InAlertDialog() {
  return (
    <AlertDialog defaultOpen modal={false}>
      <AlertDialogContent className="w-[340px]">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 className="text-mv-red" />
          </AlertDialogMedia>
          <AlertDialogTitle>Supprimer le tarif « Happy Hour » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Ce tarif est utilisé sur 6 articles du menu Bar. Ils reviendront au
            prix régulier.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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

// AlertDialogFooter is anchored to the bottom of the real open popup —
// composed here as its only true render (see design-sync's "compose
// context-required pieces" rule).

export function InAlertDialog() {
  return (
    <AlertDialog defaultOpen modal={false}>
      <AlertDialogContent size="sm" className="w-[300px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer le paiement Interac ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le mode de paiement sera désactivé pour les nouvelles commandes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Retirer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

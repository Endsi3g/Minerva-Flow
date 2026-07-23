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
  Button,
} from "minerva-flow";
import { Trash2 } from "lucide-react";

// Base UI AlertDialog is a Trigger+Portal+Popup compound with no visible
// state by default — rendered with defaultOpen so the popup is statically
// visible for the screenshot, matching the app's Dialog usage pattern.

export function Default() {
  return (
    <AlertDialog defaultOpen modal={false}>
      <AlertDialogContent className="w-[340px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
          <AlertDialogDescription>
            « Fromagerie du Marché » sera retiré de vos fournisseurs. Cette action est
            irréversible.
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

export function WithMedia() {
  return (
    <AlertDialog defaultOpen modal={false}>
      <AlertDialogContent className="w-[340px]">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 className="text-mv-red" />
          </AlertDialogMedia>
          <AlertDialogTitle>Annuler le quart de Sam Bouchard ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le quart de jeudi 17 h–23 h sera libéré et le poste redeviendra ouvert.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Retour</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Annuler le quart</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

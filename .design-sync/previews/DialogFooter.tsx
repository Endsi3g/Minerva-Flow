import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
} from "minerva-flow";

// DialogFooter only makes sense anchored to the bottom of an open dialog
// popup — composed here inside the real open parent (see design-sync's
// "compose context-required pieces" rule), same recipe as Dialog.tsx.

export function InDialog() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent className="w-[360px]">
        <DialogHeader>
          <DialogTitle>Supprimer l'article du menu</DialogTitle>
          <DialogDescription>
            « Risotto aux champignons » sera retiré du menu Terrasse.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Annuler</Button>
          <Button variant="destructive">Supprimer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

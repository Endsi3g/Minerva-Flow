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

// Base UI Dialog is a Trigger+Portal+Popup compound with no visible state
// by default — rendered with defaultOpen so the popup is statically visible
// for the screenshot, matching the app's own usage (see components/ui/command.tsx).

export function Default() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent className="w-[360px]">
        <DialogHeader>
          <DialogTitle>Modifier la réservation</DialogTitle>
          <DialogDescription>
            Table 8 · Ce soir, 19 h 30
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-mv-ink-soft">
          4 personnes · Client : Marie-Ève Tremblay · Allergie aux arachides notée.
        </p>
        <DialogFooter>
          <Button variant="outline">Annuler</Button>
          <Button>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Confirmation() {
  return (
    <Dialog defaultOpen modal={false}>
      <DialogContent className="w-[340px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Envoyer la commande en cuisine</DialogTitle>
          <DialogDescription>
            Commande #1284 — Table 12, 3 articles.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button>Confirmer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

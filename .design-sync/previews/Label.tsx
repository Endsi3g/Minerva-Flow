import * as React from "react";
import { Label, Input, Checkbox, Switch } from "minerva-flow";

export function Default() {
  return <Label htmlFor="preview-label-basic">Nom du restaurant</Label>;
}

export function WithInput() {
  return (
    <div className="flex w-[260px] flex-col gap-1.5">
      <Label htmlFor="preview-label-with-input">Adresse courriel</Label>
      <Input id="preview-label-with-input" type="email" defaultValue="gerance@flowparminerva.ca" />
    </div>
  );
}

export function WithCheckbox() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="preview-label-checkbox" defaultChecked />
      <Label htmlFor="preview-label-checkbox">J'accepte les conditions du service de livraison</Label>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="group flex items-center gap-2" data-disabled="true">
      <Switch id="preview-label-disabled" disabled />
      <Label htmlFor="preview-label-disabled">Facturation automatique (indisponible)</Label>
    </div>
  );
}

import * as React from "react";
import { Checkbox, Label } from "minerva-flow";

export function Unchecked() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="preview-checkbox-unchecked" />
      <Label htmlFor="preview-checkbox-unchecked">Sans gluten</Label>
    </div>
  );
}

export function Checked() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="preview-checkbox-checked" defaultChecked />
      <Label htmlFor="preview-checkbox-checked">Envoyer le reçu par courriel</Label>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="preview-checkbox-disabled" disabled />
      <Label htmlFor="preview-checkbox-disabled">Table accessible en fauteuil roulant</Label>
    </div>
  );
}

export function ChecklistGroup() {
  const items = [
    { id: "preview-checkbox-item-1", label: "Confirmer les allergies avec la cuisine", checked: true },
    { id: "preview-checkbox-item-2", label: "Facturer le service de terrasse", checked: true },
    { id: "preview-checkbox-item-3", label: "Ajouter le pourboire suggéré", checked: false },
  ];
  return (
    <div className="flex w-[280px] flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Checkbox id={item.id} defaultChecked={item.checked} />
          <Label htmlFor={item.id}>{item.label}</Label>
        </div>
      ))}
    </div>
  );
}

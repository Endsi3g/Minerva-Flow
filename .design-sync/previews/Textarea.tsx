import * as React from "react";
import { Textarea, Label } from "minerva-flow";

export function Default() {
  return (
    <div className="flex w-[320px] flex-col gap-1.5">
      <Label htmlFor="preview-textarea-notes">Notes de cuisine</Label>
      <Textarea
        id="preview-textarea-notes"
        defaultValue="Sans gluten, remplacer la crème par une base de noix de cajou. Servir tiède."
      />
    </div>
  );
}

export function Placeholder() {
  return (
    <div className="flex w-[320px] flex-col gap-1.5">
      <Label htmlFor="preview-textarea-comment">Commentaire du client</Label>
      <Textarea id="preview-textarea-comment" placeholder="Allergies, préférences, occasion spéciale…" />
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex w-[320px] flex-col gap-1.5">
      <Label htmlFor="preview-textarea-disabled">Description du plat</Label>
      <Textarea
        id="preview-textarea-disabled"
        defaultValue="Saumon mariné, câpres, oignon rouge, crème fraîche, pain grillé."
        disabled
      />
    </div>
  );
}

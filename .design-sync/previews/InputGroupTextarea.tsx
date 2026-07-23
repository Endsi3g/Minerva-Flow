import * as React from "react";
import { InputGroup, InputGroupAddon, InputGroupTextarea, InputGroupText } from "minerva-flow";

// InputGroupTextarea is a borderless textarea styled to sit flush inside a
// real <InputGroup> shell — it only reads correctly there, so it's
// composed here in context (see design-sync's "compose context-required
// pieces").
export function OrderNote() {
  return (
    <div className="w-[320px]">
      <InputGroup>
        <InputGroupTextarea
          defaultValue="Allergie aux noix — vérifier avec la cuisine avant d'envoyer."
          aria-label="Note pour la cuisine"
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>42 / 200</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

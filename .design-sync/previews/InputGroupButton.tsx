import * as React from "react";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "minerva-flow";
import { X } from "lucide-react";

// InputGroupButton is styled to slot into an <InputGroupAddon> inside a
// real <InputGroup> shell — it only reads correctly there, so it's
// composed here in context (see design-sync's "compose context-required
// pieces").
export function ClearSearch() {
  return (
    <div className="w-[260px]">
      <InputGroup>
        <InputGroupInput
          defaultValue="risotto"
          placeholder="Rechercher un plat…"
          aria-label="Recherche"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Effacer la recherche">
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

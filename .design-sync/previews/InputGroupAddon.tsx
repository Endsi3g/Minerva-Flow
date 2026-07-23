import * as React from "react";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "minerva-flow";

// InputGroupAddon (a prefix/suffix slot) only reads correctly inside a real
// <InputGroup> shell, so it's composed here in context (see design-sync's
// "compose context-required pieces").
export function PricePrefix() {
  return (
    <div className="w-[220px]">
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput defaultValue="18,00" aria-label="Prix" />
      </InputGroup>
    </div>
  );
}

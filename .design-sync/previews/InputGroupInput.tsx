import * as React from "react";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "minerva-flow";

// InputGroupInput is a borderless input styled to sit flush inside a real
// <InputGroup> shell — it only reads correctly there, so it's composed
// here in context (see design-sync's "compose context-required pieces").
export function UnitSuffix() {
  return (
    <div className="w-[220px]">
      <InputGroup>
        <InputGroupInput defaultValue="15" aria-label="Temps de préparation" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>min</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

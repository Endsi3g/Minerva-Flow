import * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
  InputGroupText,
} from "minerva-flow";
import { Search, X } from "lucide-react";

export function PricePrefix() {
  return (
    <div className="w-[220px]">
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput defaultValue="22,00" aria-label="Prix" />
      </InputGroup>
    </div>
  );
}

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

export function WithClearButton() {
  return (
    <div className="w-[260px]">
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Rechercher un plat…"
          defaultValue="saumon"
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

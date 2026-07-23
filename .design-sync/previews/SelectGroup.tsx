import * as React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "minerva-flow";

// SelectGroup only makes sense inside a real Select popup — composed here as
// its only true render (see design-sync's "compose context-required pieces").
export function InSelect() {
  return (
    <Select
      items={{
        entrees: "Entrées",
        plats: "Plats principaux",
        desserts: "Desserts",
        vin: "Vin rouge",
        biere: "Bière locale",
      }}
      defaultValue="entrees"
      defaultOpen
    >
      <SelectTrigger className="w-60">
        <SelectValue placeholder="Choisir un article" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectLabel>Cuisine</SelectLabel>
          <SelectItem value="entrees">Entrées</SelectItem>
          <SelectItem value="plats">Plats principaux</SelectItem>
          <SelectItem value="desserts">Desserts</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Bar</SelectLabel>
          <SelectItem value="vin">Vin rouge</SelectItem>
          <SelectItem value="biere">Bière locale</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

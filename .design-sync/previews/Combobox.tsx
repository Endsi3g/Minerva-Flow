import * as React from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
} from "minerva-flow";

const ingredients = ["Saumon fumé", "Poulet", "Champignons", "Parmesan", "Basilic", "Câpres"];

// Rendered open (defaultOpen) so the popup list is visible in a static capture.
export function Default() {
  return (
    <Combobox items={ingredients} defaultValue="Champignons" defaultOpen>
      <ComboboxInput placeholder="Rechercher un ingrédient…" className="w-64" />
      <ComboboxContent>
        <ComboboxEmpty>Aucun ingrédient trouvé.</ComboboxEmpty>
        <ComboboxList>
          {ingredients.map((item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function Closed() {
  return (
    <Combobox items={ingredients} defaultValue="Parmesan">
      <ComboboxInput placeholder="Rechercher un ingrédient…" className="w-64" />
      <ComboboxContent>
        <ComboboxList>
          {ingredients.map((item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function MultiSelectChips() {
  return (
    <Combobox multiple>
      <ComboboxChips className="w-72">
        <ComboboxChip>Terrasse</ComboboxChip>
        <ComboboxChip>Salle principale</ComboboxChip>
        <ComboboxChipsInput placeholder="Ajouter une zone…" />
      </ComboboxChips>
    </Combobox>
  );
}

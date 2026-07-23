import * as React from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "minerva-flow";
import { ClipboardList, UtensilsCrossed, Users, PackageSearch } from "lucide-react";

export function Default() {
  return (
    <Command className="w-[360px] border border-mv-border shadow-mv-md">
      <CommandInput placeholder="Rechercher une commande, un client, un article…" />
      <CommandList>
        <CommandGroup heading="Commandes">
          <CommandItem>
            <ClipboardList />
            Commande #1284 — Table 12
          </CommandItem>
          <CommandItem>
            <ClipboardList />
            Commande #1281 — Table 4
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Menu">
          <CommandItem>
            <UtensilsCrossed />
            Risotto aux champignons
            <CommandShortcut>26,00 $</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Clients">
          <CommandItem>
            <Users />
            Marc-Antoine Roy
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function EmptyState() {
  return (
    <Command className="w-[340px] border border-mv-border shadow-mv-md">
      <CommandInput placeholder="Rechercher…" />
      <CommandList>
        <CommandEmpty>Aucun résultat pour « bouillabaisse ».</CommandEmpty>
      </CommandList>
    </Command>
  );
}

export function InventoryPalette() {
  return (
    <Command className="w-[340px] border border-mv-border shadow-mv-md">
      <CommandInput placeholder="Chercher un article d'inventaire…" />
      <CommandList>
        <CommandGroup heading="Inventaire">
          <CommandItem>
            <PackageSearch />
            Saumon frais — 2,4 kg restant
          </CommandItem>
          <CommandItem>
            <PackageSearch />
            Parmesan vieilli — 900 g restant
          </CommandItem>
          <CommandItem>
            <PackageSearch />
            Farine tout usage — 12 kg restant
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

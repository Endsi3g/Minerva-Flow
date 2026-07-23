import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "minerva-flow";
import { ChevronDown, Settings2, LogOut, Printer, Pencil, Trash2 } from "lucide-react";

// Rendered open (defaultOpen) so the popup is visible in a static capture —
// DropdownMenu's content only exists once expanded.
export function Default() {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-mv-border bg-mv-surface px-3 py-2 text-sm font-medium text-mv-ink">
        Minerva — Terrasse Saint-Roch
        <ChevronDown size={14} className="text-mv-ink-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Vos restaurants</DropdownMenuLabel>
          <DropdownMenuItem>
            <span className="h-2 w-2 shrink-0 rounded-full bg-mv-green" />
            Minerva — Terrasse Saint-Roch
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span className="h-2 w-2 shrink-0 rounded-full bg-mv-amber" />
            Minerva — Vieux-Limoilou
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings2 size={14} />
          Gérer l'espace de travail
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrderActions() {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger className="rounded-lg border border-mv-border bg-mv-surface px-3 py-2 text-sm font-medium text-mv-ink">
        Actions — Commande #1284
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem>
          <Pencil size={14} />
          Modifier la commande
          <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Printer size={14} />
          Imprimer le reçu
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 size={14} />
          Annuler la commande
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CheckboxFilters() {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger className="rounded-lg border border-mv-border bg-mv-surface px-3 py-2 text-sm font-medium text-mv-ink">
        Filtrer le menu
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Catégories affichées</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked>Entrées</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>Plats principaux</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem>Desserts</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked>Boissons</DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut size={14} />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

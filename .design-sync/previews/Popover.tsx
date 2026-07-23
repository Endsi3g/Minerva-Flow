import * as React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  Badge,
  Button,
} from "minerva-flow";
import { Bell } from "lucide-react";

// Rendered open (defaultOpen) so the popup is visible in a static capture —
// Popover's content only exists once expanded.
export function Default() {
  return (
    <Popover defaultOpen>
      <PopoverTrigger
        render={
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-mv-border bg-mv-surface text-mv-ink-soft">
            <Bell size={16} />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-mv-red px-1 text-[10px] font-semibold leading-none text-white">
              3
            </span>
          </button>
        }
      />
      <PopoverContent className="w-80 p-0" sideOffset={8} align="end">
        <div className="flex items-center justify-between border-b border-mv-border-soft px-3 py-2.5">
          <p className="text-[13px] font-semibold text-mv-ink">Notifications</p>
          <button className="text-[11.5px] font-medium text-mv-green-dark hover:underline">
            Tout marquer comme lu
          </button>
        </div>
        <div className="flex flex-col">
          <button className="flex w-full flex-col gap-1 border-b border-mv-border-soft bg-mv-green-tint/40 px-3 py-2.5 text-left">
            <Badge tone="amber" dot>
              À surveiller
            </Badge>
            <p className="text-[12.5px] font-semibold text-mv-ink">Stock bas — Saumon frais</p>
            <p className="text-[12px] text-mv-ink-soft">Il reste 2,4 kg en inventaire.</p>
          </button>
          <button className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left">
            <p className="text-[12.5px] font-semibold text-mv-ink">Réservation confirmée</p>
            <p className="text-[12px] text-mv-ink-soft">Table 8 · 19h30 · 4 personnes</p>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function WithFormFields() {
  return (
    <Popover defaultOpen>
      <PopoverTrigger
        render={<Button variant="outline">Modifier l'horaire</Button>}
      />
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Horaire d'ouverture</PopoverTitle>
          <PopoverDescription>Terrasse Saint-Roch — mardi au dimanche</PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center justify-between text-sm">
          <span className="text-mv-ink-soft">Ouverture</span>
          <span className="font-medium text-mv-ink">11 h 00</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-mv-ink-soft">Fermeture</span>
          <span className="font-medium text-mv-ink">22 h 00</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import * as React from "react";
import { Tooltip, TooltipTrigger, TooltipContent, Button } from "minerva-flow";
import { Info } from "lucide-react";

// Rendered open (defaultOpen) so the bubble is visible in a static capture —
// Tooltip's content only exists once shown.
export function Default() {
  return (
    <Tooltip defaultOpen>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex cursor-help items-center text-mv-ink-faint hover:text-mv-ink"
            aria-label="Informations"
          >
            <Info size={14} />
          </button>
        }
      />
      <TooltipContent>Le prix inclut les taxes mais pas le service.</TooltipContent>
    </Tooltip>
  );
}

export function OnButton() {
  return (
    <Tooltip defaultOpen>
      <TooltipTrigger render={<Button variant="outline">Fermer le service</Button>} />
      <TooltipContent side="top">Ferme la prise de commandes pour ce soir</TooltipContent>
    </Tooltip>
  );
}

export function Sides() {
  return (
    <div className="flex items-center gap-24 py-10 px-6">
      <Tooltip defaultOpen>
        <TooltipTrigger
          render={
            <span className="rounded-md border border-mv-border bg-mv-surface px-2.5 py-1 text-xs font-medium text-mv-ink">
              Table 12
            </span>
          }
        />
        <TooltipContent side="top">Terrasse</TooltipContent>
      </Tooltip>
      <Tooltip defaultOpen>
        <TooltipTrigger
          render={
            <span className="rounded-md border border-mv-border bg-mv-surface px-2.5 py-1 text-xs font-medium text-mv-ink">
              Table 4
            </span>
          }
        />
        <TooltipContent side="bottom">Salle principale</TooltipContent>
      </Tooltip>
    </div>
  );
}

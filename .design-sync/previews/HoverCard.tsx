import * as React from "react";
import { HoverCard, HoverCardTrigger, HoverCardContent, Badge } from "minerva-flow";

// Rendered open (defaultOpen) so the popup is visible in a static capture —
// HoverCard's content only exists once shown.
export function Default() {
  return (
    <HoverCard defaultOpen>
      <HoverCardTrigger
        render={
          <span className="cursor-default border-b border-dotted border-mv-ink-faint text-sm font-medium text-mv-ink">
            Marc-Antoine Roy
          </span>
        }
      />
      <HoverCardContent>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="font-medium text-mv-ink">Marc-Antoine Roy</p>
            <Badge tone="green" dot>
              En service
            </Badge>
          </div>
          <p className="text-mv-ink-soft">Serveur — quart de soir</p>
          <p className="text-mv-ink-faint">6 tables assignées · 2 ans d'ancienneté</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function MenuItemPreview() {
  return (
    <HoverCard defaultOpen>
      <HoverCardTrigger
        render={
          <span className="cursor-default border-b border-dotted border-mv-ink-faint text-sm font-medium text-mv-ink">
            Risotto aux champignons
          </span>
        }
      />
      <HoverCardContent side="top">
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-mv-ink">Risotto aux champignons</p>
          <p className="text-mv-ink-soft">
            Champignons sauvages, parmesan vieilli 24 mois, bouillon de légumes maison.
          </p>
          <p className="font-medium text-mv-ink">26,00 $</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

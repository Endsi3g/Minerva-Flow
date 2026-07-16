"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import React from "react";

export function HelperTooltip({
  content,
  children,
}: {
  content: string;
  children?: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        {children ? (
          children
        ) : (
          <button
            type="button"
            className="inline-flex cursor-help items-center text-mv-ink-faint hover:text-mv-ink outline-none"
            aria-label="Informations"
          >
            <Info size={13} />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent className="bg-mv-ink text-mv-cream text-[11.5px] max-w-xs px-2.5 py-1.5 shadow-mv-md rounded-md border border-mv-ink">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

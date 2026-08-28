"use client";

import { ChainOfThoughtPrimitive } from "@assistant-ui/react";
import { Brain, ChevronDown } from "lucide-react";

export function ReasoningAccordion() {
  return (
    <ChainOfThoughtPrimitive.Root className="my-1.5 rounded-xl border border-mv-border/60 bg-mv-cream-soft/40 overflow-hidden text-xs">
      <ChainOfThoughtPrimitive.AccordionTrigger className="flex w-full items-center justify-between px-3 py-1.5 text-mv-ink-soft hover:text-mv-ink transition-colors group">
        <div className="flex items-center gap-1.5">
          <Brain size={13} className="text-mv-green-dark" />
          <span className="font-medium text-[11.5px]">Raisonnement Gemini 3.7 Flash</span>
        </div>
        <ChevronDown size={13} className="transition-transform group-data-[state=open]:rotate-180" />
      </ChainOfThoughtPrimitive.AccordionTrigger>

      <div className="px-3 py-2 border-t border-mv-border-soft text-mv-ink-soft font-mono text-[11px] leading-relaxed max-h-52 overflow-y-auto">
        <ChainOfThoughtPrimitive.Parts />
      </div>
    </ChainOfThoughtPrimitive.Root>
  );
}

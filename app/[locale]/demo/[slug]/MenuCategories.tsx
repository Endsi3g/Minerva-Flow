"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/Badge";
import { MenuItemThumbnail } from "@/components/prospects/MenuItemThumbnail";
import { UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ProspectMenuCategory } from "@/lib/prospects/types";

/** All categories start open — collapsing is for scanning a long menu, not for hiding the pitch. */
export function MenuCategories({ categories }: { categories: ProspectMenuCategory[] }) {
  const t = useTranslations("demo");

  return (
    <Accordion multiple defaultValue={categories.map((c) => c.id)}>
      {categories.map((category) => (
        <AccordionItem key={category.id} value={category.id} className="border-none">
          <AccordionTrigger className="py-0 hover:no-underline focus-visible:border-transparent focus-visible:ring-0">
            <h2 className="mb-3 font-display text-[17px] font-medium text-mv-ink sm:text-[19px]">
              {category.name}
            </h2>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-0">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-mv-border bg-mv-surface p-3.5 shadow-mv-sm"
                >
                  <MenuItemThumbnail
                    imageUrl={item.imageUrl}
                    alt={item.name}
                    size={44}
                    fallbackIcon={UtensilsCrossed}
                    className="rounded-xl bg-mv-green-tint text-mv-green-dark"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13.5px] font-semibold text-mv-ink">{item.name}</p>
                      <p className="shrink-0 font-display text-[13.5px] font-medium text-mv-green-dark">
                        {formatCurrency(item.priceCents / 100)}
                      </p>
                    </div>
                    {item.description && (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-mv-ink-soft">{item.description}</p>
                    )}
                    {!item.inStock && (
                      <Badge tone="neutral" className="mt-1.5">
                        {t("outOfStock")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import type { ProspectMenu, ProspectMenuCategory } from "@/lib/prospects/types";
import { Trash2, ImageOff, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function QuickMenuEditor({
  menu,
  onSave,
}: {
  menu: ProspectMenu;
  onSave: (menu: ProspectMenu) => Promise<boolean>;
}) {
  const t = useTranslations("admin.prospects.editor");
  const [categories, setCategories] = useState<ProspectMenuCategory[]>(menu.categories);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function updateItemPrice(categoryId: string, itemId: string, dollars: string) {
    const cents = Math.max(0, Math.round(Number.parseFloat(dollars || "0") * 100));
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== categoryId
          ? c
          : { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, priceCents: cents } : i)) }
      )
    );
    setDirty(true);
  }

  function toggleItemStock(categoryId: string, itemId: string, inStock: boolean) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== categoryId
          ? c
          : { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, inStock } : i)) }
      )
    );
    setDirty(true);
  }

  function removeItem(categoryId: string, itemId: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id !== categoryId ? c : { ...c, items: c.items.filter((i) => i.id !== itemId) }))
    );
    setDirty(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const ok = await onSave({ categories });
      if (ok) {
        toast.success(t("saveSuccess"));
        setDirty(false);
      } else {
        toast.error(t("saveFailed"));
      }
    } finally {
      setIsSaving(false);
    }
  }

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-[15px] font-medium text-mv-ink">{t("title")}</p>
        <Badge tone="neutral">{t("itemCount", { count: totalItems })}</Badge>
      </div>

      {categories.length === 0 ? (
        <p className="text-[13px] text-mv-ink-faint">{t("emptyMenu")}</p>
      ) : (
        <Accordion multiple defaultValue={[categories[0]?.id]}>
          {categories.map((category) => (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger>
                <span className="text-[13.5px] font-semibold text-mv-ink">
                  {category.name} <span className="font-normal text-mv-ink-faint">({category.items.length})</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-mv-border-soft bg-mv-cream-soft px-3 py-2"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mv-ink/[0.05] text-mv-ink-faint">
                        <ImageOff size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-mv-ink">{item.name}</p>
                        {item.description && (
                          <p className="truncate text-[11.5px] text-mv-ink-faint">{item.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-[12px] text-mv-ink-faint">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={(item.priceCents / 100).toFixed(2)}
                          onChange={(e) => updateItemPrice(category.id, item.id, e.target.value)}
                          className="h-8 w-20 rounded-lg border border-mv-border bg-mv-surface px-2 text-[12.5px] text-mv-ink outline-none focus-visible:border-mv-green focus-visible:ring-2 focus-visible:ring-mv-green/15"
                        />
                      </div>
                      <Switch
                        checked={item.inStock}
                        onCheckedChange={(checked: boolean) => toggleItemStock(category.id, item.id, checked)}
                        size="sm"
                        title={t("inStockToggle")}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(category.id, item.id)}
                        className="shrink-0 rounded-lg p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-red-bg hover:text-mv-red"
                        title={t("removeItem")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {category.items.length === 0 && (
                    <p className="text-[12px] text-mv-ink-faint">{t("emptyCategory")}</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isSaving || !dirty}>
          <Save data-icon="inline-start" size={14} />
          {isSaving ? t("saving") : t("saveChanges")}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MenuPriceOption } from "@/lib/types";

export function MenuPriceOptionsEditor({
  options,
  onChange,
}: {
  options: MenuPriceOption[];
  onChange: (options: MenuPriceOption[]) => void;
}) {
  function patch(index: number, values: Partial<MenuPriceOption>) {
    onChange(options.map((option, i) => (i === index ? { ...option, ...values } : option)));
  }

  return (
    <fieldset className="space-y-2 rounded-xl border border-mv-border-soft bg-mv-cream-soft/50 p-3">
      <legend className="px-1 text-[12.5px] font-semibold text-mv-ink">Formats et prix</legend>
      <p className="text-[11.5px] leading-snug text-mv-ink-faint">
        Facultatif. Ajoutez les choix fixes affichés dans l’app (par exemple 3, 6 et 9) et le prix total de chaque choix.
      </p>
      {options.map((option, index) => (
        <div key={option.id} className="grid grid-cols-[minmax(0,1fr)_5rem_6.5rem_2rem] items-end gap-2">
          <label className="min-w-0 text-[10.5px] text-mv-ink-soft">
            Format
            <input
              value={option.label}
              maxLength={80}
              onChange={(event) => patch(index, { label: event.target.value })}
              className="mt-1 h-9 w-full rounded-lg border border-mv-border bg-mv-surface px-2 text-[12px] text-mv-ink"
              aria-label={`Format ${index + 1}`}
              required
            />
          </label>
          <label className="text-[10.5px] text-mv-ink-soft">
            Qté
            <input
              type="number"
              min="1"
              max="999"
              step="1"
              value={option.quantity}
              onChange={(event) => patch(index, { quantity: Number(event.target.value) })}
              className="mt-1 h-9 w-full rounded-lg border border-mv-border bg-mv-surface px-2 text-[12px] text-mv-ink"
              aria-label={`Quantité ${index + 1}`}
              required
            />
          </label>
          <label className="text-[10.5px] text-mv-ink-soft">
            Prix total
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={option.price}
              onChange={(event) => patch(index, { price: Number(event.target.value) })}
              className="mt-1 h-9 w-full rounded-lg border border-mv-border bg-mv-surface px-2 text-[12px] text-mv-ink"
              aria-label={`Prix total ${index + 1}`}
              required
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
            className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-faint hover:bg-mv-red/10 hover:text-mv-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-mv-green"
            aria-label={`Retirer le format ${option.label || index + 1}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, { id: crypto.randomUUID(), label: "", quantity: 1, price: 0.01 }])}
        disabled={options.length >= 20}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-mv-green-dark hover:bg-mv-green/10 disabled:opacity-40"
      >
        <Plus size={14} /> Ajouter un format
      </button>
    </fieldset>
  );
}

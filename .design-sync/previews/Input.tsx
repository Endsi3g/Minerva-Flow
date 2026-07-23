import * as React from "react";
import { Input, Label } from "minerva-flow";
import { Search } from "lucide-react";

export function Default() {
  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      <Label htmlFor="preview-input-name">Nom du plat</Label>
      <Input id="preview-input-name" placeholder="Tartare de saumon" defaultValue="Risotto aux champignons" />
    </div>
  );
}

export function Placeholder() {
  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      <Label htmlFor="preview-input-table">Numéro de table</Label>
      <Input id="preview-input-table" placeholder="Ex. 12" />
    </div>
  );
}

export function WithIcon() {
  return (
    <div className="relative w-[280px]">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-mv-ink-faint" />
      <Input placeholder="Rechercher un article du menu…" className="pl-8" />
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      <Label htmlFor="preview-input-disabled">Code promo</Label>
      <Input id="preview-input-disabled" defaultValue="BIENVENUE10" disabled />
    </div>
  );
}

export function Invalid() {
  return (
    <div className="flex w-[280px] flex-col gap-1.5">
      <Label htmlFor="preview-input-invalid">Prix (avant taxes)</Label>
      <Input id="preview-input-invalid" defaultValue="-4,00" aria-invalid />
      <p className="text-xs text-mv-red">Le prix doit être positif.</p>
    </div>
  );
}

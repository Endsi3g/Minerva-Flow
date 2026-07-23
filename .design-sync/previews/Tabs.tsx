import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "minerva-flow";

// Pill styling on TabsList/TabsTrigger matches the app's real usage
// (see app/[locale]/(app)/finance/FinanceView.tsx) rather than the bare
// shadcn defaults, which read as unstyled at rest.

export function Default() {
  return (
    <Tabs defaultValue="midi" className="w-[360px]">
      <TabsList className="h-auto rounded-full border border-mv-border bg-mv-cream-soft p-1">
        <TabsTrigger
          value="midi"
          className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
        >
          Service du midi
        </TabsTrigger>
        <TabsTrigger
          value="soir"
          className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm"
        >
          Service du soir
        </TabsTrigger>
      </TabsList>
      <TabsContent value="midi">
        <p className="text-sm text-mv-ink-soft">
          18 commandes · 1 214,30 $ de ventes · Clôturé à 14 h 05.
        </p>
      </TabsContent>
      <TabsContent value="soir">
        <p className="text-sm text-mv-ink-soft">
          En cours · 6 tables occupées · 342,80 $ jusqu'à présent.
        </p>
      </TabsContent>
    </Tabs>
  );
}

export function LineVariant() {
  return (
    <Tabs defaultValue="ventes" className="w-[360px]">
      <TabsList variant="line">
        <TabsTrigger value="ventes" className="data-active:text-mv-green-dark data-active:after:bg-mv-green">
          Ventes
        </TabsTrigger>
        <TabsTrigger value="depenses" className="data-active:text-mv-green-dark data-active:after:bg-mv-green">
          Dépenses
        </TabsTrigger>
        <TabsTrigger value="paie" className="data-active:text-mv-green-dark data-active:after:bg-mv-green">
          Paie
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ventes">
        <p className="text-sm text-mv-ink-soft">Revenu net cette semaine : 6 420 $.</p>
      </TabsContent>
      <TabsContent value="depenses">
        <p className="text-sm text-mv-ink-soft">Dépenses cette semaine : 2 180 $.</p>
      </TabsContent>
      <TabsContent value="paie">
        <p className="text-sm text-mv-ink-soft">Paie estimée : 3 950 $.</p>
      </TabsContent>
    </Tabs>
  );
}

import * as React from "react";
import { PageHeader, Button } from "minerva-flow";
import { Plus } from "lucide-react";

export function Default() {
  return (
    <div className="w-[640px]">
      <PageHeader
        eyebrow="Commandes"
        title="Commande #1284"
        description="Table 12 · Ouverte il y a 18 minutes · 4 couverts"
        action={
          <Button size="sm" variant="secondary">
            Imprimer la facture
          </Button>
        }
      />
    </div>
  );
}

export function Simple() {
  return (
    <div className="w-[560px]">
      <PageHeader title="Tableau de bord" />
    </div>
  );
}

export function WithPrimaryAction() {
  return (
    <div className="w-[620px]">
      <PageHeader
        eyebrow="Menu"
        title="Articles du menu"
        description="Gérez les plats, prix et disponibilités du menu Flow."
        action={
          <Button size="sm">
            <Plus data-icon="inline-start" />
            Nouvel article
          </Button>
        }
      />
    </div>
  );
}

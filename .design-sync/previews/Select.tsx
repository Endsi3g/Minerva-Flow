import * as React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectSeparator,
} from "minerva-flow";

const categoryItems = {
  entrees: "Entrées",
  plats: "Plats principaux",
  desserts: "Desserts",
  boissons: "Boissons",
};

const roleItems = {
  serveur: "Serveur",
  cuisinier: "Cuisinier",
  hote: "Hôte / Hôtesse",
  gerant: "Gérant",
};

// Rendered open (defaultOpen) so the popup is visible in a static capture —
// Select's content only exists once expanded.
export function Default() {
  return (
    <Select items={categoryItems} defaultValue="plats" defaultOpen>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Choisir une catégorie" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="entrees">Entrées</SelectItem>
        <SelectItem value="plats">Plats principaux</SelectItem>
        <SelectItem value="desserts">Desserts</SelectItem>
        <SelectSeparator />
        <SelectItem value="boissons">Boissons</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function Small() {
  return (
    <Select items={roleItems} defaultValue="serveur" defaultOpen>
      <SelectTrigger size="sm" className="w-48">
        <SelectValue placeholder="Assigner un rôle" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="serveur">Serveur</SelectItem>
        <SelectItem value="cuisinier">Cuisinier</SelectItem>
        <SelectItem value="hote">Hôte / Hôtesse</SelectItem>
        <SelectItem value="gerant">Gérant</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function Closed() {
  return (
    <Select
      items={{ "table-12": "Table 12 — Terrasse", "table-4": "Table 4 — Salle" }}
      defaultValue="table-12"
    >
      <SelectTrigger className="w-52">
        <SelectValue placeholder="Choisir une table" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="table-12">Table 12 — Terrasse</SelectItem>
        <SelectItem value="table-4">Table 4 — Salle</SelectItem>
      </SelectContent>
    </Select>
  );
}

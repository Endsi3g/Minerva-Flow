import * as React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  Badge,
} from "minerva-flow";

const rows = [
  { item: "Tartare de saumon", category: "Entrée", price: "18,00 $", status: "En cuisine" },
  { item: "Risotto aux champignons", category: "Plat", price: "26,00 $", status: "Servi" },
  { item: "Burger Minerva", category: "Plat", price: "22,00 $", status: "En cuisine" },
  { item: "Tarte au citron", category: "Dessert", price: "11,00 $", status: "Servi" },
];

export function Default() {
  return (
    <Table className="w-[560px]">
      <TableCaption>Commande #1284 — Table 12</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Article</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Prix</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.item}>
            <TableCell className="font-medium">{r.item}</TableCell>
            <TableCell>{r.category}</TableCell>
            <TableCell>{r.price}</TableCell>
            <TableCell>
              <Badge tone={r.status === "Servi" ? "green" : "amber"} dot>
                {r.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

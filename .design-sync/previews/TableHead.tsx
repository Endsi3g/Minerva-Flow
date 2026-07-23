import * as React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "minerva-flow";

// TableHead only makes sense inside a real <table> — composed here as its
// only true render (see design-sync's "compose context-required pieces").
export function InTable() {
  return (
    <Table className="w-[420px]">
      <TableHeader>
        <TableRow>
          <TableHead>Article</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Prix</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Burger Minerva</TableCell>
          <TableCell>Plat</TableCell>
          <TableCell>22,00 $</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

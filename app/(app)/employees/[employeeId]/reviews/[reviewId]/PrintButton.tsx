"use client";

import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <Button size="sm" variant="secondary" onClick={() => window.print()}>
      <Download size={14} /> Télécharger en PDF
    </Button>
  );
}

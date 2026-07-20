"use client";

import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

export function PrintButton() {
  const t = useTranslations("reviewPrintPage");
  return (
    <Button size="sm" variant="secondary" onClick={() => window.print()}>
      <Download size={14} /> {t("downloadPdf")}
    </Button>
  );
}

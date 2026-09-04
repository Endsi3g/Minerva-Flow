"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CalendarDays, Download, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface InvoiceItem {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "refunded" | "open" | "void";
  invoiceUrl?: string;
  description?: string;
}

interface InvoiceHistoryProps {
  className?: string;
  title?: string;
  description?: string;
  invoices: InvoiceItem[];
  onDownload?: (invoiceId: string) => void;
}

export function InvoiceHistory({
  className,
  title = "Historique des factures",
  description = "Vos factures et reçus de paiement passés.",
  invoices,
  onDownload,
}: InvoiceHistoryProps) {
  if (!invoices) return null;

  const statusBadge = (status: InvoiceItem["status"]) => {
    switch (status) {
      case "paid":
        return (
          <Badge tone="green" variant="solid">
            Payée
          </Badge>
        );
      case "refunded":
        return <Badge tone="neutral">Remboursée</Badge>;
      case "open":
        return <Badge tone="amber" variant="outline">En attente</Badge>;
      case "void":
        return <Badge tone="neutral" variant="outline">Annulée</Badge>;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      {(title || description) && (
        <CardHeader className="space-y-1">
          {title && (
            <CardTitle className="flex items-center gap-2 truncate text-base text-lg leading-tight font-medium sm:gap-3 sm:text-xl">
              <ReceiptText className="text-primary h-4 w-4" />
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-muted-foreground text-sm">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent>
        <Table>
          <TableCaption className="sr-only">
            List of past invoices with dates, amounts, status and download
            actions
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  Aucune facture pour l&apos;instant
                </TableCell>
              </TableRow>
            )}
            {invoices.map((inv) => (
              <TableRow key={inv.id} className="group">
                <TableCell className="text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {inv.date}
                  </div>
                </TableCell>
                <TableCell className="max-w-[320px]">
                  <div
                    className="truncate"
                    title={inv.description || "Facture"}
                  >
                    {inv.description || "Facture"}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {inv.amount}
                </TableCell>
                <TableCell className="text-right">
                  {statusBadge(inv.status)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      inv.invoiceUrl
                        ? window.open(
                            inv.invoiceUrl,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        : onDownload?.(inv.id)
                    }
                    aria-label={`Télécharger la facture ${inv.id}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Télécharger
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

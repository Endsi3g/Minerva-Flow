import {
  Table as ShadcnTable,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils";
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
      <ShadcnTable className="min-w-[720px]">{children}</ShadcnTable>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <TableHeader>
      <TableRow className="border-b border-mv-border bg-mv-cream-soft hover:bg-mv-cream-soft">
        {children}
      </TableRow>
    </TableHeader>
  );
}

export function Th({
  children,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <TableHead
      className={cn(
        "h-auto px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint",
        className
      )}
      {...rest}
    >
      {children}
    </TableHead>
  );
}

export function Tr({
  children,
  className,
  onClick,
  active,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "border-b border-mv-border-soft last:border-0 transition-colors",
        onClick && "cursor-pointer hover:bg-mv-green-tint/60",
        active && "bg-mv-green-tint hover:bg-mv-green-tint",
        className
      )}
    >
      {children}
    </TableRow>
  );
}

export function Td({
  children,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <TableCell
      className={cn("px-4 py-3.5 align-middle text-[13.5px] text-mv-ink", className)}
      {...rest}
    >
      {children}
    </TableCell>
  );
}

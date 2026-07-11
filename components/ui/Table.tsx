import { cn } from "@/lib/utils";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-mv-border bg-mv-cream-soft">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint",
        className
      )}
      {...rest}
    >
      {children}
    </th>
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
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-mv-border-soft last:border-0 transition-colors",
        onClick && "cursor-pointer hover:bg-mv-green-tint/60",
        active && "bg-mv-green-tint",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3.5 align-middle text-[13.5px] text-mv-ink", className)} {...rest}>
      {children}
    </td>
  );
}

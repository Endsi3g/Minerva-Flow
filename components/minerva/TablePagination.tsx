"use client";

import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Numbers to show around the current page, plus first/last with ellipses when they don't fit. */
function pageWindow(page: number, pageCount: number): (number | "ellipsis")[] {
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(sorted[i]);
  }
  return out;
}

/**
 * Client-side pager for an in-memory filtered list (transactions, customers)
 * — numbered page buttons rather than the anchor-based Pagination primitive,
 * since these tables paginate a useState array, not a URL/searchParams.
 */
export function TablePagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      <Button
        size="icon-sm"
        variant="ghost"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Page précédente"
      >
        <ChevronLeft size={14} />
      </Button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-1 text-[12px] text-mv-ink-faint">
            …
          </span>
        ) : (
          <Button
            key={p}
            size="icon-sm"
            variant={p === page ? "outline" : "ghost"}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className="text-[12.5px]"
          >
            {p}
          </Button>
        )
      )}
      <Button
        size="icon-sm"
        variant="ghost"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Page suivante"
      >
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}

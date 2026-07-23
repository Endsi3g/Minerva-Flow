import * as React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "minerva-flow";

// PaginationEllipsis stands in for skipped pages — it only reads correctly
// inside a real <Pagination><PaginationContent> list, so it's composed here
// in context (see design-sync's "compose context-required pieces").
export function InPagination() {
  return (
    <Pagination className="w-[420px]">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" text="Précédent" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            8
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">9</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" text="Suivant" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  paramName?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  paramName = "page",
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-border/60 px-2 py-4">
      <div className="text-xs text-muted-foreground">
        Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={createPageURL(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage <= 1}
          tabIndex={currentPage <= 1 ? -1 : undefined}
          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
        >
          <Button variant="outline" size="sm" className="gap-1 h-8 px-3 text-xs" disabled={currentPage <= 1}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
        </Link>
        <Link
          href={createPageURL(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage >= totalPages}
          tabIndex={currentPage >= totalPages ? -1 : undefined}
          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
        >
          <Button variant="outline" size="sm" className="gap-1 h-8 px-3 text-xs" disabled={currentPage >= totalPages}>
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

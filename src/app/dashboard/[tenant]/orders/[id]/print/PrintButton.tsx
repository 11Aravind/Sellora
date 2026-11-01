"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      className="gap-2 text-xs font-semibold shadow-xs"
    >
      <Printer className="h-4 w-4" />
      <span>Print Packing Slip</span>
    </Button>
  );
}


import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface ProductStockBadgeProps {
  stock: number;
  trackInventory: boolean;
}

export function ProductStockBadge({ stock, trackInventory }: ProductStockBadgeProps) {
  if (!trackInventory) {
    return (
      <Badge variant="outline" className="text-[11px] font-normal border-border/80 text-muted-foreground">
        Inventory untracked
      </Badge>
    );
  }

  if (stock <= 0) {
    return (
      <Badge variant="destructive" className="text-[11px] font-semibold">
        Out of Stock
      </Badge>
    );
  }

  if (stock <= 5) {
    return (
      <Badge
        variant="outline"
        className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10"
      >
        Low Stock: {stock} left
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/5"
    >
      {stock} in stock
    </Badge>
  );
}

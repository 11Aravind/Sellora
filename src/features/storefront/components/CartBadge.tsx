"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";

export function CartBadge() {
  const { itemCount, isHydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Shopping Cart with ${isHydrated ? itemCount : 0} items`}
    >
      <div className="relative">
        <ShoppingBag className="h-5 w-5" />
        {isHydrated && itemCount > 0 && (
          <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in fade-in zoom-in-50">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </div>
      <span className="hidden sm:inline">Cart</span>
    </Link>
  );
}


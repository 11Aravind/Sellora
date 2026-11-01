"use client";

import Link from "next/link";
import { ShoppingCart, Image as ImageIcon } from "lucide-react";
import type { StorefrontProduct } from "../types";
import { useCart } from "../context/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const { addItem } = useCart();
  const isOutOfStock = product.track_inventory && product.stock <= 0;
  const isLowStock =
    product.track_inventory &&
    product.stock > 0 &&
    product.low_stock_threshold !== null &&
    product.stock <= product.low_stock_threshold;

  const hasDiscount =
    product.compare_at_price !== null &&
    product.compare_at_price > product.price;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-border">
      {/* Product Image */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden bg-muted/40"
      >
        {product.primary_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {hasDiscount && (
            <Badge variant="destructive" className="text-[11px] font-semibold px-2 py-0.5 shadow-sm">
              Sale
            </Badge>
          )}
          {isOutOfStock ? (
            <Badge variant="outline" className="bg-background/90 text-destructive border-destructive/30 text-[11px] font-medium backdrop-blur-sm">
              Out of stock
            </Badge>
          ) : isLowStock ? (
            <Badge variant="outline" className="bg-background/90 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium backdrop-blur-sm">
              Only {product.stock} left
            </Badge>
          ) : null}
        </div>
      </Link>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-4">
        {product.category_name && (
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            {product.category_name}
          </p>
        )}
        <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          <Link href={`/products/${product.slug}`}>
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-bold text-foreground">
              ₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                ₹{product.compare_at_price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant={isOutOfStock ? "outline" : "default"}
            disabled={isOutOfStock}
            onClick={() => addItem(product.id, 1)}
            aria-label={`Add ${product.name} to cart`}
            className="h-8 px-3 gap-1.5 shrink-0"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="text-xs">{isOutOfStock ? "Out" : "Add"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}


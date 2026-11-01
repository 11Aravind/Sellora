"use client";

import { useState } from "react";
import { ShoppingCart, Check, Plus, Minus } from "lucide-react";
import type { StorefrontProduct } from "../types";
import { useCart } from "../context/CartContext";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ product }: { product: StorefrontProduct }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const isOutOfStock = product.track_inventory && product.stock <= 0;
  const maxAvailable = product.track_inventory ? Math.min(product.stock, 100) : 100;

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(prev + 1, maxAvailable));
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(product.id, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* Quantity Stepper */}
        {!isOutOfStock && (
          <div className="flex items-center rounded-lg border border-border bg-background shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={quantity <= 1}
              onClick={handleDecrement}
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span
              className="w-10 text-center text-sm font-semibold text-foreground select-none"
              aria-live="polite"
            >
              {quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={quantity >= maxAvailable}
              onClick={handleIncrement}
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Add To Cart Button */}
        <Button
          size="lg"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          className="flex-1 gap-2 text-sm font-semibold shadow-sm transition-all"
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4 text-primary-foreground" />
              <span>Added to Cart!</span>
            </>
          ) : isOutOfStock ? (
            <span>Out of Stock</span>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              <span>Add to Cart</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}


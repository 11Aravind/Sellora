"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { getCartHydratedProductsAction } from "../actions";
import type { HydratedCartProduct, CartValidationWarning } from "../types";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CartView({
  tenantId,
}: {
  tenantId: string;
}) {
  const { items, isHydrated, updateQuantity, removeItem } = useCart();
  const [productsMap, setProductsMap] = useState<Record<string, HydratedCartProduct>>({});
  const [warnings, setWarnings] = useState<CartValidationWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live products for current cart items
  useEffect(() => {
    if (!isHydrated) return;

    if (items.length === 0) {
      const timer = setTimeout(() => {
        setProductsMap({});
        setWarnings([]);
        setIsLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let isMounted = true;
    const productIds = items.map((i) => i.productId);

    const timer = setTimeout(() => {
      setIsLoading(true);
      getCartHydratedProductsAction(tenantId, productIds)
        .then((liveProducts) => {
          if (!isMounted) return;

          const map: Record<string, HydratedCartProduct> = {};
          const newWarnings: CartValidationWarning[] = [];

          liveProducts.forEach((p) => {
            map[p.id] = p;
          });

          // Validate each cart item against fresh database records
          items.forEach((item) => {
            const live = map[item.productId];
            if (!live || live.status !== "active") {
              newWarnings.push({
                productId: item.productId,
                productName: live?.name || "An item in your cart",
                type: "unavailable",
                message: `"${live?.name || "An item"}" is no longer available and should be removed.`,
              });
            } else if (live.track_inventory) {
              if (live.stock <= 0) {
                newWarnings.push({
                  productId: item.productId,
                  productName: live.name,
                  type: "out_of_stock",
                  message: `"${live.name}" is now out of stock.`,
                });
              } else if (live.stock < item.quantity) {
                newWarnings.push({
                  productId: item.productId,
                  productName: live.name,
                  type: "stock_reduced",
                  message: `Only ${live.stock} units of "${live.name}" are available.`,
                  availableQuantity: live.stock,
                });
                // Auto-adjust quantity in cart
                updateQuantity(item.productId, live.stock);
              }
            }
          });

          setProductsMap(map);
          setWarnings(newWarnings);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to hydrate cart products:", err);
          if (isMounted) setIsLoading(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [items, isHydrated, tenantId, updateQuantity]);

  // Calculate subtotal from DB prices only
  const { subtotal, hasInvalidItems } = useMemo(() => {
    let sum = 0;
    let invalid = false;

    for (const item of items) {
      const prod = productsMap[item.productId];
      if (!prod || prod.status !== "active") {
        invalid = true;
        continue;
      }
      if (prod.track_inventory && prod.stock <= 0) {
        invalid = true;
        continue;
      }
      sum += prod.price * item.quantity;
    }

    return { subtotal: sum, hasInvalidItems: invalid };
  }, [items, productsMap]);

  if (!isHydrated || (isLoading && Object.keys(productsMap).length === 0 && items.length > 0)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking fresh prices and stock...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-4">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Looks like you haven&apos;t added anything to your cart yet. Explore our catalog to find items you love!
        </p>
        <div className="mt-6">
          <Link
            href="/products"
            className={buttonVariants({ size: "lg", className: "gap-2 shadow-sm" })}
          >
            <span>Start Shopping</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Shopping Cart
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {items.length} {items.length === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <Alert key={idx} variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{w.message}</span>
                {w.type === "unavailable" && (
                  <button
                    onClick={() => removeItem(w.productId)}
                    className="font-semibold underline ml-2 hover:opacity-80"
                  >
                    Remove
                  </button>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Grid: Cart Items & Summary */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-border/70 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
            {items.map((item) => {
              const product = productsMap[item.productId];
              const isUnavailable = !product || product.status !== "active";
              const isOutOfStock = product?.track_inventory && product.stock <= 0;
              const maxQty = product?.track_inventory ? Math.min(product.stock, 100) : 100;

              return (
                <div
                  key={item.productId}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5"
                >
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/30">
                      {product?.primary_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.primary_image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                          <ShoppingBag className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      {product ? (
                        <Link
                          href={`/products/${product.slug}`}
                          className="font-semibold text-foreground text-sm hover:text-primary transition-colors line-clamp-1"
                        >
                          {product.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-muted-foreground text-sm">
                          Loading item...
                        </span>
                      )}

                      <div className="text-xs text-muted-foreground">
                        {product ? (
                          <span>
                            ₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })} each
                          </span>
                        ) : null}
                      </div>

                      {isUnavailable && (
                        <span className="inline-block text-[11px] font-semibold text-destructive">
                          Item unavailable
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="inline-block text-[11px] font-semibold text-destructive">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper & Price */}
                  <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0">
                    <div className="flex items-center rounded-lg border border-border bg-background shadow-xs">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= maxQty}
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <div className="font-bold text-foreground text-sm">
                        ₹{product ? (product.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link
              href="/products"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "text-xs text-muted-foreground" })}
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-5 sticky top-24">
            <h2 className="font-bold text-foreground text-base">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm divide-y divide-border/60">
              <div className="flex justify-between text-muted-foreground pt-1">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">
                  ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-3">
                <span>Shipping</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Free (Cash on Delivery)
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-3">
                <span>Total</span>
                <span>
                  ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {hasInvalidItems || subtotal <= 0 ? (
              <button
                disabled
                className={buttonVariants({ size: "lg", className: "w-full gap-2 font-semibold shadow-sm opacity-50 cursor-not-allowed" })}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/checkout"
                className={buttonVariants({ size: "lg", className: "w-full gap-2 font-semibold shadow-sm" })}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Safe & Secure Cash on Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

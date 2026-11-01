"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShieldCheck,
  Truck,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { getCartHydratedProductsAction, placeOrderAction } from "../actions";
import { shippingAddressSchema, type ShippingAddressFormValues } from "../schemas";
import type { HydratedCartProduct } from "../types";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SchemaType = Parameters<typeof zodResolver>[0];

export function CheckoutView({
  tenantId,
  tenantName,
  userEmail,
  userName,
}: {
  tenantId: string;
  tenantName: string;
  userEmail: string;
  userName?: string | null;
}) {
  const router = useRouter();
  const { items, isHydrated, clearCart } = useCart();
  const [productsMap, setProductsMap] = useState<Record<string, HydratedCartProduct>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const idempotencyStorageKey = `checkout_idempotency_${tenantId}`;

  // Manage client idempotency key lazily to avoid double submissions and unnecessary re-renders
  const [idempotencyKey] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      let key = sessionStorage.getItem(idempotencyStorageKey);
      if (!key) {
        key = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(idempotencyStorageKey, key);
      }
      return key;
    } catch {
      return `ord_${Date.now()}`;
    }
  });

  // Fetch live products for current cart items
  useEffect(() => {
    if (!isHydrated) return;

    if (items.length === 0) {
      const timer = setTimeout(() => {
        setIsLoadingProducts(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let isMounted = true;
    const productIds = items.map((i) => i.productId);

    const timer = setTimeout(() => {
      setIsLoadingProducts(true);
      getCartHydratedProductsAction(tenantId, productIds)
        .then((liveProducts) => {
          if (!isMounted) return;
          const map: Record<string, HydratedCartProduct> = {};
          liveProducts.forEach((p) => {
            map[p.id] = p;
          });
          setProductsMap(map);
          setIsLoadingProducts(false);
        })
        .catch((err) => {
          console.error("Failed to load products for checkout:", err);
          if (isMounted) setIsLoadingProducts(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [items, isHydrated, tenantId]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingAddressFormValues>({
    resolver: zodResolver(shippingAddressSchema as unknown as SchemaType),
    defaultValues: {
      fullName: userName || "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pinCode: "",
      notes: "",
    },
  });

  // Calculate live subtotal strictly from DB prices
  const { subtotal, validationError } = useMemo(() => {
    let sum = 0;
    let error: string | null = null;

    if (items.length === 0) {
      return { subtotal: 0, validationError: "Your cart is empty." };
    }

    for (const item of items) {
      const prod = productsMap[item.productId];
      if (!prod || prod.status !== "active") {
        error = `"${prod?.name || "An item"}" is no longer available. Please return to your cart.`;
        break;
      }
      if (prod.track_inventory && prod.stock < item.quantity) {
        error = `"${prod.name}" has only ${prod.stock} units left in stock. Please adjust your cart.`;
        break;
      }
      sum += prod.price * item.quantity;
    }

    return { subtotal: sum, validationError: error };
  }, [items, productsMap]);

  const onSubmit = async (values: ShippingAddressFormValues) => {
    if (validationError || subtotal <= 0 || isSubmitting) return;

    setOrderError(null);
    setIsSubmitting(true);

    try {
      const res = await placeOrderAction({
        tenantId,
        items,
        shipping: values,
        notes: values.notes,
        idempotencyKey,
      });

      if (!res.success) {
        setOrderError(res.message || "Failed to place order.");
        setIsSubmitting(false);
      } else {
        // Clear cart and remove used idempotency key
        clearCart();
        try {
          sessionStorage.removeItem(idempotencyStorageKey);
        } catch {
          // ignore
        }
        router.push(`/orders/${res.data?.orderId}?placed=1`);
      }
    } catch {
      setOrderError("An unexpected error occurred while placing your order. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!isHydrated || isLoadingProducts) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing checkout...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground mb-3" />
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Your cart is empty
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Please add items to your cart before proceeding to checkout.
        </p>
        <div className="mt-6">
          <Link
            href="/products"
            className={buttonVariants({ size: "sm" })}
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Link href="/cart" className="hover:underline">
            Cart
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Checkout</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Checkout
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Signed in as <span className="font-medium text-foreground">{userEmail}</span>
        </p>
      </div>

      {/* Validation or Order Errors */}
      {(validationError || orderError) && (
        <Alert variant="destructive" className="text-xs">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{validationError || orderError}</span>
            {validationError && (
              <Link
                href="/cart"
                className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs ml-4" })}
              >
                Return to Cart
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Shipping Address & Payment */}
          <div className="lg:col-span-7 space-y-6">
            {/* Delivery Address Card */}
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Truck className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">
                  Shipping & Delivery Address
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName" className="text-xs font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    {...register("fullName")}
                    placeholder="Recipient's name"
                    className="h-9 text-xs"
                  />
                  {errors.fullName && (
                    <p className="text-[11px] text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="phone" className="text-xs font-medium">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    placeholder="10-digit mobile number"
                    className="h-9 text-xs"
                  />
                  {errors.phone && (
                    <p className="text-[11px] text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="addressLine1" className="text-xs font-medium">
                    Flat, House no., Building, Street <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addressLine1"
                    {...register("addressLine1")}
                    placeholder="e.g. Flat 402, Sunshine Apartments"
                    className="h-9 text-xs"
                  />
                  {errors.addressLine1 && (
                    <p className="text-[11px] text-destructive">{errors.addressLine1.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="addressLine2" className="text-xs font-medium">
                    Area, Colony, Landmark (Optional)
                  </Label>
                  <Input
                    id="addressLine2"
                    {...register("addressLine2")}
                    placeholder="e.g. Near Metro Station"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-medium">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="e.g. Mumbai"
                    className="h-9 text-xs"
                  />
                  {errors.city && (
                    <p className="text-[11px] text-destructive">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-medium">
                    State <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="state"
                    {...register("state")}
                    placeholder="e.g. Maharashtra"
                    className="h-9 text-xs"
                  />
                  {errors.state && (
                    <p className="text-[11px] text-destructive">{errors.state.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pinCode" className="text-xs font-medium">
                    6-Digit PIN Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pinCode"
                    maxLength={6}
                    {...register("pinCode")}
                    placeholder="e.g. 400001"
                    className="h-9 text-xs"
                  />
                  {errors.pinCode && (
                    <p className="text-[11px] text-destructive">{errors.pinCode.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notes" className="text-xs font-medium">
                    Delivery Instructions / Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="e.g. Ring bell twice, deliver after 5 PM"
                    rows={2}
                    className="text-xs resize-none"
                  />
                  {errors.notes && (
                    <p className="text-[11px] text-destructive">{errors.notes.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Lock className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">
                  Payment Method
                </h2>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border-2 border-primary/60 bg-primary/5 p-4">
                <input
                  type="radio"
                  id="cod"
                  name="paymentMethod"
                  value="cod"
                  checked
                  readOnly
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                />
                <div className="space-y-1">
                  <Label htmlFor="cod" className="font-semibold text-foreground text-sm cursor-pointer">
                    Cash on Delivery (COD)
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pay easily in cash or with UPI when your package arrives at your doorstep. No advance payment required.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Review & Place Order CTA */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-5 sticky top-24">
              <h2 className="font-bold text-foreground text-base">
                Order Review ({items.length} {items.length === 1 ? "item" : "items"})
              </h2>

              {/* Items preview list */}
              <div className="max-h-60 overflow-y-auto divide-y divide-border/50 pr-1 space-y-2">
                {items.map((item) => {
                  const product = productsMap[item.productId];
                  return (
                    <div key={item.productId} className="flex items-center justify-between gap-3 pt-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {product?.primary_image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.primary_image}
                            alt=""
                            className="h-10 w-10 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {product?.name || "Item"}
                          </p>
                          <p className="text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="font-semibold text-foreground shrink-0">
                        ₹{product ? (product.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cost calculations */}
              <div className="space-y-2 text-xs border-t border-border/60 pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">
                    ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Free (COD)
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border/50">
                  <span>Order Total</span>
                  <span>
                    ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Place Order CTA */}
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || Boolean(validationError) || subtotal <= 0}
                className="w-full gap-2 font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Placing order...</span>
                  </>
                ) : (
                  <>
                    <span>Place Order (Cash on Delivery)</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Orders are fulfilled directly by {tenantName}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

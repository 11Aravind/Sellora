import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontTenant, getCustomerOrderById } from "@/features/storefront/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { slug, id } = await params;
  const { placed } = await searchParams;

  const tenant = await getStorefrontTenant(slug);
  if (!tenant) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/orders/${id}`);
  }

  // Customer B cannot open Customer A's order -> getCustomerOrderById returns null via RLS
  const order = await getCustomerOrderById(tenant.id, id);
  if (!order) {
    notFound();
  }

  const isNewlyPlaced = placed === "1";
  const shipping = order.shipping_address as Record<string, string> | null;
  const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Newly Placed Celebratory Banner */}
      {isNewlyPlaced && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 text-center space-y-3 animate-in fade-in zoom-in-95">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Order Confirmed!
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Thank you for shopping with {tenant.name}. We&apos;ve received your order and are preparing it for delivery.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-4 py-1.5 text-xs font-semibold text-foreground border border-border/60">
            <span>Order Number:</span>
            <span className="font-mono text-primary font-bold">{order.order_number}</span>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/orders"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1 text-xs text-muted-foreground" })}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Back to Orders</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize text-xs">
            {order.status}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            COD Pending
          </Badge>
        </div>
      </div>

      {/* Order Details Header */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {order.order_number}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Placed on {orderDate}</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">Payment Method</p>
            <p className="text-sm font-semibold text-foreground">
              Cash on Delivery (COD)
            </p>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ordered Items
          </h3>
          <div className="divide-y divide-border/60">
            {order.order_items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground flex-shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {item.name}
                    </p>
                    <p className="text-muted-foreground">
                      {item.sku ? `SKU: ${item.sku} • ` : ""}Qty: {item.quantity} × ₹
                      {item.unit_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="font-bold text-foreground text-sm">
                  ₹{item.line_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Totals */}
        <div className="space-y-2 border-t border-border/60 pt-4 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">
              ₹{order.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Free (Cash on Delivery)
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border/50">
            <span>Total Payable</span>
            <span>
              ₹{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping Address & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              Delivery Address
            </h3>
          </div>
          {shipping ? (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-sm">
                {shipping.name}
              </p>
              <p>{shipping.phone}</p>
              <p>{shipping.address_line_1}</p>
              {shipping.address_line_2 && <p>{shipping.address_line_2}</p>}
              <p>
                {shipping.city}, {shipping.state} - {shipping.pin_code}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No address recorded</p>
          )}
        </div>

        {/* Delivery Details & Notes */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Truck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              Delivery Instructions
            </h3>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              Your order will be shipped by {tenant.name}. Please keep the exact cash amount ready upon delivery.
            </p>
            {order.notes && (
              <div className="rounded-lg bg-muted/40 p-2.5 border border-border/50">
                <p className="font-medium text-foreground text-[11px] mb-0.5">Note:</p>
                <p className="italic">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center pt-4">
        <Link
          href="/products"
          className={buttonVariants({ size: "lg", className: "gap-2 shadow-sm" })}
        >
          <span>Continue Shopping</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

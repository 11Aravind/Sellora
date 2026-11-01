import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Package, ChevronRight, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontTenant, getCustomerOrders } from "@/features/storefront/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function CustomerOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getStorefrontTenant(slug);

  if (!tenant) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/orders");
  }

  const orders = await getCustomerOrders(tenant.id);

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          My Orders
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Track and review your purchases from {tenant.name}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-4">
            <Package className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            No orders placed yet
          </h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            When you purchase items from our store, they will appear here with live tracking.
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
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const itemCount =
              order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={order.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-xs hover:border-border transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">
                      {order.order_number}
                    </span>
                    <Badge variant="outline" className="capitalize text-[11px]">
                      {order.status}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      Cash on Delivery
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {orderDate}
                    </span>
                    <span>•</span>
                    <span>
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-border/60 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="font-bold text-foreground text-sm">
                      ₹{order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1 text-xs" })}
                  >
                    <span>View Order</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

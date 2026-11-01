import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { requireUser } from "@/features/auth/queries";
import {
  getTenantBySlug,
  getTenantUsage,
  getTenantOverviewStats,
} from "@/features/tenants/queries";
import { getLowStockProducts } from "@/features/catalog/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { UsageMeter } from "@/components/shared/UsageMeter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface OverviewPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function TenantDashboardOverviewPage({
  params,
}: OverviewPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;

  const result = await getTenantBySlug(slug, user.id);
  if (!result) {
    notFound();
  }

  const { tenant } = result;

  const [usageInfo, stats, lowStockItems] = await Promise.all([
    getTenantUsage(tenant.id),
    getTenantOverviewStats(tenant.id),
    getLowStockProducts(tenant.id, 5),
  ]);

  const formattedTodayRev = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(stats.revenueTodayPaise / 100);

  const formatted7DaysRev = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(stats.revenue7DaysPaise / 100);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${tenant.name} Overview`}
        description="Monitor sales performance, resource quota consumption, and low-inventory alerts."
        action={
          <Link href={`/dashboard/${slug}/products/new`}>
            <Button size="sm" className="gap-1.5 text-xs font-semibold h-8">
              <Package className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </Link>
        }
      />

      {/* Revenue & Order Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Revenue */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Today&apos;s Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formattedTodayRev}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats.ordersTodayCount} order{stats.ordersTodayCount === 1 ? "" : "s"} today
            </p>
          </CardContent>
        </Card>

        {/* 7-Day Revenue */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              7-Day Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatted7DaysRev}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats.orders7DaysCount} order{stats.orders7DaysCount === 1 ? "" : "s"} in past 7 days
            </p>
          </CardContent>
        </Card>

        {/* Active Products */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {usageInfo.usage.products}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {usageInfo.limits.products === null
                ? "Unlimited capacity"
                : `${usageInfo.limits.products - usageInfo.usage.products} slots remaining`}
            </p>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Team Size
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {usageInfo.usage.staff + 1}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              1 Owner + {usageInfo.usage.staff} Staff member{usageInfo.usage.staff === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Quotas Usage Meter */}
      <UsageMeter usageInfo={usageInfo} tenantSlug={slug} />

      {/* Low Stock Alerts & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Items Card */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base font-bold">Low Stock Alerts</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Items with 5 or fewer units remaining in tracked inventory.
              </CardDescription>
            </div>
            <Link href={`/dashboard/${slug}/products?sort=stock_asc`}>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                All tracked inventory items are adequately stocked.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <Link
                        href={`/dashboard/${slug}/products/${item.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {item.sku ? `SKU: ${item.sku}` : `/${item.slug}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.stock <= 0 ? "destructive" : "outline"}
                        className={`text-[11px] font-semibold ${
                          item.stock > 0
                            ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                            : ""
                        }`}
                      >
                        {item.stock <= 0 ? "Out of stock" : `${item.stock} left`}
                      </Badge>

                      <Link href={`/dashboard/${slug}/products/${item.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2">
                          Restock
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders Card */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-bold">Recent Store Orders</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Customer purchases and payment activity.
              </CardDescription>
            </div>
            <Link href={`/dashboard/${slug}/orders`}>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                <span>All orders</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="text-xs text-muted-foreground">
                  No orders have been placed on your store yet.
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Customer checkout will automatically populate your order queue and analytics.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground font-mono">
                        {order.order_number}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(order.created_at), "PPP p")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(order.total)}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Store,
  Users,
  Package,
  ShoppingCart,
  Globe,
} from "lucide-react";

import { getSuperAdminStoreDetail } from "@/features/plans/queries";
import { StoreDetailStatusButton } from "@/features/tenants/components/StoreDetailStatusButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

interface SuperAdminStoreDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SuperAdminStoreDetailPage({
  params,
}: SuperAdminStoreDetailPageProps) {
  const { id } = await params;
  const store = await getSuperAdminStoreDetail(id);

  if (!store) {
    notFound();
  }

  const { usage } = store;
  const productPercentage = usage.max_products
    ? Math.min(100, Math.round((usage.products_used / usage.max_products) * 100))
    : 0;
  const staffPercentage = usage.max_staff
    ? Math.min(100, Math.round((usage.staff_used / usage.max_staff) * 100))
    : 0;
  const orderPercentage = usage.max_orders
    ? Math.min(100, Math.round((usage.orders_used / usage.max_orders) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Back button & Action Header */}
      <div className="space-y-4">
        <Link href="/super-admin/stores">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to all stores</span>
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {store.name}
                </h1>
                <Badge
                  variant={store.status === "active" ? "default" : "destructive"}
                  className="capitalize text-xs"
                >
                  {store.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                <span>{store.slug}</span>
                {store.custom_domain && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-primary">
                      <Globe className="h-3 w-3" />
                      {store.custom_domain}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StoreDetailStatusButton
              tenantId={store.id}
              storeName={store.name}
              currentStatus={store.status}
            />
          </div>
        </div>
      </div>

      {/* Usage Meter Card (RPC tenant_usage) */}
      <Card className="border-border/70 shadow-sm bg-gradient-to-br from-card via-card to-muted/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            Real-Time Resource Usage (DB Triggers & Limits)
          </CardTitle>
          <CardDescription className="text-xs">
            Live consumption tracked against subscription plan quotas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Products */}
            <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-background/50">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Package className="h-4 w-4 text-primary" />
                  Products Catalog
                </span>
                <span className="font-mono text-muted-foreground">
                  {usage.max_products === null
                    ? `${usage.products_used} / Unlimited`
                    : `${usage.products_used} / ${usage.max_products}`}
                </span>
              </div>
              {usage.max_products !== null && (
                <Progress value={productPercentage} className="h-2" />
              )}
            </div>

            {/* Staff */}
            <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-background/50">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Staff Members
                </span>
                <span className="font-mono text-muted-foreground">
                  {usage.max_staff === null
                    ? `${usage.staff_used} / Unlimited`
                    : `${usage.staff_used} / ${usage.max_staff}`}
                </span>
              </div>
              {usage.max_staff !== null && (
                <Progress value={staffPercentage} className="h-2" />
              )}
            </div>

            {/* Monthly Orders */}
            <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-background/50">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  Monthly Orders
                </span>
                <span className="font-mono text-muted-foreground">
                  {usage.max_orders === null
                    ? `${usage.orders_used} / Unlimited`
                    : `${usage.orders_used} / ${usage.max_orders}`}
                </span>
              </div>
              {usage.max_orders !== null && (
                <Progress value={orderPercentage} className="h-2" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Grid: Store Details & Subscription */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store & Owner Info */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Store & Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Owner Name:</span>
              <span className="font-semibold text-foreground">{store.owner.full_name || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Owner Email:</span>
              <span className="font-mono text-foreground">{store.owner.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Registered:</span>
              <span>{format(new Date(store.created_at), "PPP p")}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Total Lifetime Orders:</span>
              <span className="font-bold text-foreground">{store.ordersCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Subscription */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Subscription Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {store.subscription ? (
              <>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Plan:</span>
                  <Badge variant="outline" className="font-semibold">
                    {store.subscription.plan_name} ({store.subscription.plan_code})
                  </Badge>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Subscription State:</span>
                  <Badge variant="default" className="capitalize text-[10px]">
                    {store.subscription.status}
                  </Badge>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-semibold text-foreground">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(store.subscription.price_paise / 100)}{" "}
                    / {store.subscription.billing_interval}
                  </span>
                </div>
                {store.subscription.trial_ends_at && (
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Trial Ends:</span>
                    <span>{format(new Date(store.subscription.trial_ends_at), "PPP")}</span>
                  </div>
                )}
                {store.subscription.current_period_end && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Current Period Ends:</span>
                    <span>{format(new Date(store.subscription.current_period_end), "PPP")}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No active subscription found for this store.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Store Members Table */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Team Members</CardTitle>
          <CardDescription className="text-xs">
            Staff and administrators with dashboard access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">User</th>
                  <th className="px-4 py-2.5 font-semibold">Email</th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {store.members.map((member) => (
                  <tr key={member.user_id}>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {member.full_name || "Anonymous Member"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">
                      {member.email}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {format(new Date(member.created_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Transactions Table */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Subscription Payments</CardTitle>
          <CardDescription className="text-xs">
            Billing history and invoice transactions for this merchant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {store.payments.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No payment transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Payment ID</th>
                    <th className="px-4 py-2.5 font-semibold">Amount</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {store.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {p.razorpay_payment_id || p.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-foreground">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: p.currency,
                        }).format(p.amount_paise / 100)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={p.status === "paid" ? "default" : "secondary"}
                          className="capitalize text-[10px]"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {format(new Date(p.created_at), "PPP p")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

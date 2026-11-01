"use client";

import * as React from "react";
import Link from "next/link";
import { Package, Users, ShoppingCart, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpgradeDialog } from "@/features/subscriptions/components/UpgradeDialog";
import type { TenantUsageInfo } from "@/features/tenants/types";

interface UsageMeterProps {
  usageInfo: TenantUsageInfo;
  tenantSlug: string;
  className?: string;
  compact?: boolean;
}

export function UsageMeter({
  usageInfo,
  tenantSlug,
  className = "",
  compact = false,
}: UsageMeterProps) {
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState<string>("PLAN_LIMIT_PRODUCTS");

  const { limits, usage, plan_name: planName } = usageInfo;

  // Helper to calculate percentage and color classes
  const getUsageStatus = (current: number, max: number | null) => {
    if (max === null) {
      return { percentage: 0, isUnlimited: true, colorClass: "bg-primary", textColorClass: "text-muted-foreground" };
    }
    const pct = Math.min(100, Math.round((current / max) * 100));
    if (pct >= 100) {
      return { percentage: pct, isUnlimited: false, colorClass: "bg-destructive", textColorClass: "text-destructive font-semibold" };
    }
    if (pct >= 80) {
      return { percentage: pct, isUnlimited: false, colorClass: "bg-amber-500", textColorClass: "text-amber-600 dark:text-amber-400 font-semibold" };
    }
    return { percentage: pct, isUnlimited: false, colorClass: "bg-emerald-500", textColorClass: "text-muted-foreground" };
  };

  const productStatus = getUsageStatus(usage.products, limits.products);
  const staffStatus = getUsageStatus(usage.staff, limits.staff);
  const orderStatus = getUsageStatus(usage.orders_this_month, limits.orders_per_month);

  const isNearOrAtLimit =
    productStatus.percentage >= 80 ||
    staffStatus.percentage >= 80 ||
    orderStatus.percentage >= 80;

  const handleOpenUpgrade = (reason: string) => {
    setUpgradeReason(reason);
    setShowUpgradeModal(true);
  };

  if (compact) {
    return (
      <>
        <div className={`p-4 rounded-xl border border-border/70 bg-card shadow-sm space-y-3 ${className}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-primary" />
              Products Usage
            </span>
            <span className={`text-xs font-mono ${productStatus.textColorClass}`}>
              {limits.products === null
                ? `${usage.products} (Unlimited)`
                : `${usage.products} of ${limits.products} used`}
            </span>
          </div>
          {limits.products !== null && (
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${productStatus.colorClass}`}
                style={{ width: `${productStatus.percentage}%` }}
              />
            </div>
          )}
          {productStatus.percentage >= 80 && (
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {productStatus.percentage >= 100 ? "Product quota full!" : "Approaching product limit"}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[11px] px-2 gap-1"
                onClick={() => handleOpenUpgrade("PLAN_LIMIT_PRODUCTS")}
              >
                <span>Upgrade</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <UpgradeDialog
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          tenantSlug={tenantSlug}
          errorCode={upgradeReason}
        />
      </>
    );
  }

  return (
    <>
      <Card className={`border-border/80 shadow-sm ${className}`}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold">Plan Quotas & Usage</CardTitle>
              {planName && (
                <Badge variant="outline" className="capitalize text-[11px] font-semibold border-primary/40 text-primary">
                  {planName}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5">
              Real-time resource meters enforced automatically by database triggers.
            </CardDescription>
          </div>

          <Link href={`/dashboard/${tenantSlug}/billing`}>
            <Button
              size="sm"
              variant={isNearOrAtLimit ? "default" : "outline"}
              className="text-xs h-8 gap-1.5 font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Upgrade Plan</span>
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Products Meter */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Package className="h-4 w-4 text-primary" />
                  Active Products
                </span>
                <span className={`font-mono ${productStatus.textColorClass}`}>
                  {limits.products === null
                    ? `${usage.products} / Unlimited`
                    : `${usage.products} / ${limits.products}`}
                </span>
              </div>
              {limits.products !== null && (
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${productStatus.colorClass}`}
                    style={{ width: `${productStatus.percentage}%` }}
                  />
                </div>
              )}
            </div>

            {/* Staff Meter */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Staff Members
                </span>
                <span className={`font-mono ${staffStatus.textColorClass}`}>
                  {limits.staff === null
                    ? `${usage.staff} / Unlimited`
                    : `${usage.staff} / ${limits.staff}`}
                </span>
              </div>
              {limits.staff !== null && (
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${staffStatus.colorClass}`}
                    style={{ width: `${staffStatus.percentage}%` }}
                  />
                </div>
              )}
            </div>

            {/* Monthly Orders Meter */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  Monthly Orders
                </span>
                <span className={`font-mono ${orderStatus.textColorClass}`}>
                  {limits.orders_per_month === null
                    ? `${usage.orders_this_month} / Unlimited`
                    : `${usage.orders_this_month} / ${limits.orders_per_month}`}
                </span>
              </div>
              {limits.orders_per_month !== null && (
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${orderStatus.colorClass}`}
                    style={{ width: `${orderStatus.percentage}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <UpgradeDialog
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        tenantSlug={tenantSlug}
        errorCode={upgradeReason}
      />
    </>
  );
}

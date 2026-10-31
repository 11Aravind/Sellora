import Link from "next/link";
import { BarChart3, Package, ShoppingCart, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TenantDashboardOverviewPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Overview"
        description="Welcome to your store administration. Monitor sales, catalog, and store activity."
        action={
          <Link href={`/dashboard/${slug}/products`}>
            <Button size="sm" className="gap-1.5">
              <Package className="h-4 w-4" />
              Manage Products
            </Button>
          </Link>
        }
      />

      {/* Quick Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for sale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
            <p className="text-xs text-muted-foreground mt-1">Gross merchandise</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground mt-1">Store owner</p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome / Quickstart Card */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Sparkles className="h-4 w-4" />
            Quick Setup Guide
          </div>
          <CardTitle className="text-xl">Your store is online and ready!</CardTitle>
          <CardDescription>
            Follow these essential steps to prepare your store for your first customer order.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-lg border border-border bg-background space-y-2">
            <h4 className="font-semibold text-sm">1. Add Categories & Products</h4>
            <p className="text-xs text-muted-foreground">
              Create product categories and publish your first item with photos and pricing.
            </p>
            <Link href={`/dashboard/${slug}/products`} className="inline-flex text-xs text-primary font-medium hover:underline pt-1">
              Go to catalog →
            </Link>
          </div>

          <div className="p-4 rounded-lg border border-border bg-background space-y-2">
            <h4 className="font-semibold text-sm">2. Check Subscription Plan</h4>
            <p className="text-xs text-muted-foreground">
              Review your trial period, product quotas, and monthly order limits.
            </p>
            <Link href={`/dashboard/${slug}/billing`} className="inline-flex text-xs text-primary font-medium hover:underline pt-1">
              View billing →
            </Link>
          </div>

          <div className="p-4 rounded-lg border border-border bg-background space-y-2">
            <h4 className="font-semibold text-sm">3. Customize Store Settings</h4>
            <p className="text-xs text-muted-foreground">
              Configure store branding, logo, contact phone, and custom domain options.
            </p>
            <Link href={`/dashboard/${slug}/settings`} className="inline-flex text-xs text-primary font-medium hover:underline pt-1">
              Store settings →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

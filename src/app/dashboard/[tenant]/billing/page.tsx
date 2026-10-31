import * as React from "react";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Package,
  Users,
  ShoppingCart,
  Calendar,
  ShieldCheck,
  Clock,
} from "lucide-react";

import { requireUser } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActivePlans } from "@/features/plans/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RazorpayCheckoutButton } from "@/features/subscriptions/components/RazorpayCheckoutButton";
import { ChangePlanModal } from "@/features/subscriptions/components/ChangePlanModal";
import { CancelSubscriptionModal } from "@/features/subscriptions/components/CancelSubscriptionModal";

export const dynamic = "force-dynamic";

interface BillingPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  const user = await requireUser();
  const { tenant: slug } = await params;

  const supabase = await createClient();

  // 1. Resolve tenant and check user membership
  const { data: memberData } = await supabase
    .from("tenant_members")
    .select(`
      role,
      tenants!inner (
        id,
        name,
        slug
      )
    `)
    .eq("user_id", user.id)
    .eq("tenants.slug", slug)
    .maybeSingle();

  interface MemberQueryResult {
    role: string;
    tenants:
      | { id: string; name: string; slug: string }
      | { id: string; name: string; slug: string }[];
  }

  const member = memberData as unknown as MemberQueryResult | null;

  if (!member || !member.tenants) {
    notFound();
  }

  const tenant = Array.isArray(member.tenants)
    ? member.tenants[0]
    : member.tenants;
  const isOwner = member.role === "owner";

  // 2. Fetch current subscription, payments, usage RPC, and active plans
  const admin = createAdminClient();
  const [
    { data: subData },
    { data: paymentsData },
    { data: usageData },
    activePlans,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(`
        id,
        status,
        trial_ends_at,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        razorpay_subscription_id,
        plans (
          id,
          name,
          code,
          price_paise,
          billing_interval,
          trial_days
        )
      `)
      .eq("tenant_id", tenant.id)
      .maybeSingle(),
    supabase
      .from("subscription_payments")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false }),
    (admin.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>)(
      "tenant_usage",
      { p_tenant: tenant.id }
    ),
    getActivePlans(),
  ]);

  interface SubQueryResult {
    id: string;
    status: string;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    razorpay_subscription_id: string | null;
    plans:
      | {
          id: string;
          name: string;
          code: string;
          price_paise: number;
          billing_interval: string;
          trial_days: number;
        }
      | {
          id: string;
          name: string;
          code: string;
          price_paise: number;
          billing_interval: string;
          trial_days: number;
        }[]
      | null;
  }

  interface PaymentRow {
    id: string;
    amount_paise: number;
    currency: string;
    status: string;
    razorpay_payment_id: string | null;
    created_at: string;
  }

  interface UsageDataResult {
    usage?: {
      products: number;
      staff: number;
      orders_this_month: number;
    };
    limits?: {
      products: number | null;
      staff: number | null;
      orders_per_month: number | null;
      custom_domain: boolean;
    };
  }

  const subscription = subData as unknown as SubQueryResult | null;
  const payments = paymentsData as unknown as PaymentRow[] | null;
  const usageRpcResult = usageData as unknown as UsageDataResult | null;

  const plan = Array.isArray(subscription?.plans)
    ? subscription.plans[0]
    : subscription?.plans;

  const usage = usageRpcResult?.usage || {
    products: 0,
    staff: 0,
    orders_this_month: 0,
  };
  const limits = usageRpcResult?.limits || {
    products: null,
    staff: null,
    orders_per_month: null,
    custom_domain: false,
  };

  const productPercentage = limits.products
    ? Math.min(100, Math.round((usage.products / limits.products) * 100))
    : 0;
  const staffPercentage = limits.staff
    ? Math.min(100, Math.round((usage.staff / limits.staff) * 100))
    : 0;
  const orderPercentage = limits.orders_per_month
    ? Math.min(100, Math.round((usage.orders_this_month / limits.orders_per_month) * 100))
    : 0;

  const isTrialing = subscription?.status === "trialing";
  const isActive = subscription?.status === "active";
  const isPastDue = subscription?.status === "past_due";
  const isCancelled = subscription?.status === "cancelled" || subscription?.cancel_at_period_end;

  const formattedPrice = plan
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(plan.price_paise / 100)
    : "₹0";

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <PageHeader
        title="Subscription & Billing"
        description="Manage your store's plan, upgrade quotas, and review payment history."
      />

      {/* Subscription Status Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {plan?.name || "No Active Plan"}
                </CardTitle>
                <Badge
                  variant={
                    isActive
                      ? "default"
                      : isTrialing
                      ? "secondary"
                      : isPastDue
                      ? "destructive"
                      : "outline"
                  }
                  className="capitalize text-xs font-semibold"
                >
                  {subscription?.status || "Incomplete"}
                </Badge>
                {subscription?.cancel_at_period_end && (
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/40 text-xs">
                    Cancels at cycle end
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs pt-1">
                {formattedPrice} / {plan?.billing_interval || "month"}
              </CardDescription>
            </div>

            {isOwner && (
              <div className="flex flex-wrap items-center gap-2">
                {!isActive && (
                  <RazorpayCheckoutButton
                    tenantId={tenant.id}
                    isTrialing={isTrialing}
                  />
                )}
                {plan && (
                  <ChangePlanModal
                    tenantId={tenant.id}
                    currentPlanId={plan.id}
                    availablePlans={activePlans}
                  />
                )}
                {isActive && !isCancelled && (
                  <CancelSubscriptionModal
                    tenantId={tenant.id}
                    periodEnd={subscription?.current_period_end}
                  />
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {isTrialing && subscription?.trial_ends_at && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Free Trial Active</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Expires {format(new Date(subscription.trial_ends_at), "PPP")}
                  </div>
                </div>
              </div>
            )}

            {subscription?.current_period_end && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border/60 bg-muted/30">
                <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">
                    {isCancelled ? "Access Ends On" : "Next Renewal Date"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(subscription.current_period_end), "PPP")}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border/60 bg-muted/30">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">Custom Domain</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {limits.custom_domain ? "Included on this plan" : "Upgrade to Pro for custom domains"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Quotas & Usage Meters */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Resource Quotas & Triggers</CardTitle>
          <CardDescription className="text-xs">
            Database triggers automatically enforce limits on your store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Products */}
            <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Package className="h-4 w-4 text-primary" />
                  Products
                </span>
                <span className="font-mono text-muted-foreground">
                  {limits.products === null
                    ? `${usage.products} / Unlimited`
                    : `${usage.products} / ${limits.products}`}
                </span>
              </div>
              {limits.products !== null && (
                <Progress value={productPercentage} className="h-2" />
              )}
            </div>

            {/* Staff */}
            <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Staff Members
                </span>
                <span className="font-mono text-muted-foreground">
                  {limits.staff === null
                    ? `${usage.staff} / Unlimited`
                    : `${usage.staff} / ${limits.staff}`}
                </span>
              </div>
              {limits.staff !== null && (
                <Progress value={staffPercentage} className="h-2" />
              )}
            </div>

            {/* Monthly Orders */}
            <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  Monthly Orders
                </span>
                <span className="font-mono text-muted-foreground">
                  {limits.orders_per_month === null
                    ? `${usage.orders_this_month} / Unlimited`
                    : `${usage.orders_this_month} / ${limits.orders_per_month}`}
                </span>
              </div>
              {limits.orders_per_month !== null && (
                <Progress value={orderPercentage} className="h-2" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Payment History & Invoices</CardTitle>
          <CardDescription className="text-xs">
            All billing charges and renewals recorded via Razorpay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No payment transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Payment ID</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono text-foreground">
                        {p.razorpay_payment_id || p.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: p.currency,
                        }).format(p.amount_paise / 100)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={p.status === "paid" ? "default" : "destructive"}
                          className="capitalize text-[10px]"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
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

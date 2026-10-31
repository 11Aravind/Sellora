import * as React from "react";
import Link from "next/link";
import Form from "next/form";
import { format } from "date-fns";
import { AlertCircle, Clock, ExternalLink } from "lucide-react";

import { getSuperAdminSubscriptions } from "@/features/plans/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SuperAdminSubscriptionsPageProps {
  searchParams: Promise<{
    status?: string;
    trialEndingSoon?: string;
    pastDue?: string;
    page?: string;
  }>;
}

export default async function SuperAdminSubscriptionsPage({
  searchParams,
}: SuperAdminSubscriptionsPageProps) {
  const params = await searchParams;
  const status = params.status || "all";
  const trialEndingSoon = params.trialEndingSoon === "true";
  const pastDue = params.pastDue === "true";
  const page = parseInt(params.page || "1", 10) || 1;

  const data = await getSuperAdminSubscriptions({
    status,
    trialEndingSoon,
    pastDue,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Records"
        description="Monitor vendor subscription lifecycles, active billing statuses, trial expiries, and renewals."
      />

      {/* Filter Bar */}
      <div className="rounded-lg border border-border/70 p-4 bg-card shadow-sm">
        <Form
          action="/super-admin/subscriptions"
          className="flex flex-wrap items-center gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">Status:</span>
            <select
              name="status"
              defaultValue={status}
              className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="trialing">Trialing</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex items-center gap-3 ml-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                name="trialEndingSoon"
                value="true"
                defaultChecked={trialEndingSoon}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="h-3 w-3" />
                Trial ending within 7 days
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                name="pastDue"
                value="true"
                defaultChecked={pastDue}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="flex items-center gap-1 text-destructive font-medium">
                <AlertCircle className="h-3 w-3" />
                Past Due Only
              </span>
            </label>
          </div>

          <div className="ml-auto">
            <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
              Apply Filters
            </Button>
          </div>
        </Form>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-lg border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Store</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Rate</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Trial Expiry</th>
                <th className="px-4 py-3 font-semibold">Period Expiry</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    No subscriptions matching the filter criteria found.
                  </td>
                </tr>
              ) : (
                data.subscriptions.map((sub) => {
                  const formattedPrice = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(sub.price_paise / 100);

                  const isPastDue = sub.status === "past_due";
                  const isTrialing = sub.status === "trialing";

                  return (
                    <tr key={sub.id} className="hover:bg-muted/20 transition-colors text-xs">
                      <td className="px-4 py-3">
                        <Link
                          href={`/super-admin/stores/${sub.tenant_id}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {sub.tenant_name}
                        </Link>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {sub.tenant_slug}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-medium text-[11px]">
                          {sub.plan_name}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {formattedPrice} / {sub.billing_interval}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            sub.status === "active"
                              ? "default"
                              : isTrialing
                              ? "secondary"
                              : isPastDue
                              ? "destructive"
                              : "outline"
                          }
                          className="capitalize text-[10px]"
                        >
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.trial_ends_at ? (
                          format(new Date(sub.trial_ends_at), "MMM d, yyyy")
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.current_period_end ? (
                          format(new Date(sub.current_period_end), "MMM d, yyyy")
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(sub.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/super-admin/stores/${sub.tenant_id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <span>Store</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={data.totalPages} />
    </div>
  );
}

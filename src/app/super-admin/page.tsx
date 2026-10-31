import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Store,
  CheckCircle2,
  Clock,
  CreditCard,
  TrendingUp,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { getSuperAdminOverview } from "@/features/plans/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  const stats = await getSuperAdminOverview();

  const formattedMRR = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(stats.estimatedMrrPaise / 100);

  const statCards = [
    {
      title: "Total Stores",
      value: stats.totalStores.toString(),
      description: "All vendors registered",
      icon: Store,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Active Stores",
      value: stats.activeStores.toString(),
      description: "Stores currently open",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Trialing",
      value: stats.trialingSubscriptions.toString(),
      description: "Active free trials",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Paying Stores",
      value: stats.payingSubscriptions.toString(),
      description: "Active paid subscriptions",
      icon: CreditCard,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Estimated MRR",
      value: formattedMRR,
      description: "Monthly recurring revenue",
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Overview"
        description="Monitor system health, revenue trajectory, and active tenant storefronts."
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Stores Table */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Newest Stores</CardTitle>
            <CardDescription className="text-xs">
              The 10 most recent merchant stores onboarded onto the platform.
            </CardDescription>
          </div>
          <Link href="/super-admin/stores">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <span>View all stores</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentStores.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No merchant stores have onboarded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Store</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {stats.recentStores.map((store) => (
                    <tr key={store.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div>{store.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {store.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {store.owner_email}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge variant="outline" className="font-medium">
                          {store.plan_name}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={store.status === "active" ? "default" : "destructive"}
                          className="capitalize text-[11px]"
                        >
                          {store.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(store.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/super-admin/stores/${store.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <span>Details</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
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

"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminStoreListItem } from "@/features/plans/types";
import { adminSetTenantStatusAction } from "@/features/tenants/actions";

interface AdminStoresTableProps {
  stores: AdminStoreListItem[];
}

export function AdminStoresTable({ stores }: AdminStoresTableProps) {
  const [storeToToggle, setStoreToToggle] = React.useState<AdminStoreListItem | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleToggleStatus = () => {
    if (!storeToToggle) return;
    const nextStatus = storeToToggle.status === "active" ? "suspended" : "active";

    startTransition(async () => {
      const res = await adminSetTenantStatusAction(storeToToggle.id, nextStatus);

      if (!res.ok) {
        toast.error("Status update failed", { description: res.message });
      } else {
        toast.success(`Store ${nextStatus === "suspended" ? "suspended" : "reactivated"} successfully!`);
        setStoreToToggle(null);
      }
    });
  };

  return (
    <>
      <div className="rounded-lg border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Store</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Subscription</th>
                <th className="px-4 py-3 font-semibold">Products</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    No merchant stores found matching your criteria.
                  </td>
                </tr>
              ) : (
                stores.map((store) => {
                  const productLimitText =
                    store.max_products === null
                      ? `${store.products_count} / ∞`
                      : `${store.products_count} / ${store.max_products}`;

                  const isSuspended = store.status === "suspended";

                  return (
                    <tr key={store.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/super-admin/stores/${store.id}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {store.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">
                          {store.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-foreground">{store.owner_name}</div>
                        <div className="text-muted-foreground">{store.owner_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge variant="outline" className="font-medium">
                          {store.plan_name}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge
                          variant={
                            store.subscription_status === "active"
                              ? "default"
                              : store.subscription_status === "trialing"
                              ? "secondary"
                              : "destructive"
                          }
                          className="capitalize text-[10px]"
                        >
                          {store.subscription_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {productLimitText}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={isSuspended ? "destructive" : "default"}
                          className="capitalize text-[10px]"
                        >
                          {store.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(store.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/super-admin/stores/${store.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <span>View</span>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>

                          <Button
                            variant={isSuspended ? "outline" : "destructive"}
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setStoreToToggle(store)}
                          >
                            {isSuspended ? (
                              <>
                                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                <span>Reactivate</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="h-3 w-3" />
                                <span>Suspend</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend / Reactivate Confirmation Dialog */}
      <AlertDialog
        open={Boolean(storeToToggle)}
        onOpenChange={() => setStoreToToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {storeToToggle?.status === "active"
                ? `Suspend store: ${storeToToggle?.name}?`
                : `Reactivate store: ${storeToToggle?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {storeToToggle?.status === "active"
                ? "Suspending this store will immediately cause its customer storefront and subdomains to display an 'unavailable' notice and prevent orders from being placed. The vendor can still log in to their dashboard."
                : "Reactivating this store will restore its customer storefront, allowing customers to view products and place orders again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isPending}
              className={
                storeToToggle?.status === "active"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : storeToToggle?.status === "active" ? (
                "Confirm Suspend"
              ) : (
                "Confirm Reactivate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

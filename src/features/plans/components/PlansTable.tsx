"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Edit2,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

import type { PlanWithMeta } from "../types";
import { togglePlanStatusAction, deletePlanAction } from "../actions";
import { PlanFormDialog } from "./PlanFormDialog";

interface PlansTableProps {
  plans: PlanWithMeta[];
}

export function PlansTable({ plans }: PlansTableProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<PlanWithMeta | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [planToDelete, setPlanToDelete] = React.useState<PlanWithMeta | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleCreate = () => {
    setSelectedPlan(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: PlanWithMeta) => {
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const handleToggleActive = (plan: PlanWithMeta) => {
    startTransition(async () => {
      const res = await togglePlanStatusAction(plan.id, !plan.is_active);
      if (!res.ok) {
        toast.error("Failed to update plan status", { description: res.message });
      } else {
        toast.success(`Plan ${!plan.is_active ? "activated" : "deactivated"}`);
      }
    });
  };

  const handleDelete = () => {
    if (!planToDelete) return;
    startTransition(async () => {
      const res = await deletePlanAction(planToDelete.id);
      if (!res.ok) {
        toast.error("Cannot delete plan", { description: res.message });
      } else {
        toast.success("Plan deleted successfully");
        setPlanToDelete(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate} className="gap-1.5 text-xs">
          <Plus className="h-4 w-4" />
          <span>Create New Plan</span>
        </Button>
      </div>

      <div className="rounded-lg border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Name & Code</th>
                <th className="px-4 py-3 font-semibold">Billing</th>
                <th className="px-4 py-3 font-semibold">Price (INR)</th>
                <th className="px-4 py-3 font-semibold">Trial</th>
                <th className="px-4 py-3 font-semibold">Limits (P / S / O)</th>
                <th className="px-4 py-3 font-semibold">Stores</th>
                <th className="px-4 py-3 font-semibold text-center">Active</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    No plans found. Click &quot;Create New Plan&quot; to build your first tier.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => {
                  const hasStores = plan.subscriptions_count > 0;
                  const formattedPrice = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(plan.price_paise / 100);

                  const limitsSummary = [
                    plan.max_products === null ? "∞ Prod" : `${plan.max_products} Prod`,
                    plan.max_staff === null ? "∞ Staff" : `${plan.max_staff} Staff`,
                    plan.max_orders_per_month === null ? "∞ Ord" : `${plan.max_orders_per_month} Ord`,
                  ].join(" · ");

                  return (
                    <tr key={plan.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{plan.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {plan.code}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-xs">
                        <Badge variant="outline" className="text-[11px]">
                          {plan.billing_interval}ly
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground text-xs">
                        {formattedPrice}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {plan.trial_days > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {plan.trial_days} days
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {limitsSummary}
                        {plan.custom_domain_allowed && (
                          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                            Custom Domain
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge
                          variant={hasStores ? "default" : "secondary"}
                          className="text-[11px]"
                        >
                          {plan.subscriptions_count} store(s)
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={plan.is_active}
                          onCheckedChange={() => handleToggleActive(plan)}
                          disabled={isPending}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(plan)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {hasStores ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span tabIndex={0} className="inline-block">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 opacity-40 cursor-not-allowed text-muted-foreground pointer-events-none"
                                      disabled
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  Referenced by active stores. Deactivate instead.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => setPlanToDelete(plan)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

      {/* Create / Edit Plan Dialog */}
      <PlanFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        planToEdit={selectedPlan}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(planToDelete)} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently remove the <span className="font-semibold text-foreground">{planToDelete?.name}</span> plan. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

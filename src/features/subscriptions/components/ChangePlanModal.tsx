"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Plan } from "@/features/plans/queries";
import { changePlanAction } from "../actions";

interface ChangePlanModalProps {
  tenantId: string;
  currentPlanId: string;
  availablePlans: Plan[];
}

export function ChangePlanModal({
  tenantId,
  currentPlanId,
  availablePlans,
}: ChangePlanModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>(currentPlanId);
  const [isPending, startTransition] = React.useTransition();

  const handleConfirmChange = () => {
    if (selectedPlanId === currentPlanId) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const res = await changePlanAction(tenantId, selectedPlanId);
      if (!res.ok) {
        toast.error("Failed to change plan", { description: res.message });
      } else {
        toast.success("Subscription plan updated successfully!");
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Change Plan</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Change Subscription Plan</DialogTitle>
          <DialogDescription className="text-xs">
            Upgrade or downgrade your store&apos;s quotas. New plan limits apply immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {availablePlans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isSelected = plan.id === selectedPlanId;
            const formattedPrice = new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(plan.price_paise / 100);

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/70 hover:border-border"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{plan.name}</span>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-[10px]">
                        Current Plan
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plan.max_products === null ? "Unlimited" : plan.max_products} Products ·{" "}
                    {plan.max_staff === null ? "Unlimited" : plan.max_staff} Staff ·{" "}
                    {plan.max_orders_per_month === null ? "Unlimited" : plan.max_orders_per_month} Orders/mo
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="font-extrabold text-foreground text-base">
                      {formattedPrice}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      /{plan.billing_interval}
                    </div>
                  </div>
                  <div className="w-5 h-5 flex items-center justify-center rounded-full border border-border">
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-primary fill-primary text-primary-foreground" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmChange}
            disabled={isPending || selectedPlanId === currentPlanId}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            <span>Confirm Plan Change</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

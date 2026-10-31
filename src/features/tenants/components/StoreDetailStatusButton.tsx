"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
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
import { adminSetTenantStatusAction } from "@/features/tenants/actions";

interface StoreDetailStatusButtonProps {
  tenantId: string;
  storeName: string;
  currentStatus: "active" | "suspended";
}

export function StoreDetailStatusButton({
  tenantId,
  storeName,
  currentStatus,
}: StoreDetailStatusButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const isSuspended = currentStatus === "suspended";
  const targetStatus = isSuspended ? "active" : "suspended";

  const handleToggle = () => {
    startTransition(async () => {
      const res = await adminSetTenantStatusAction(tenantId, targetStatus);
      if (!res.ok) {
        toast.error("Status update failed", { description: res.message });
      } else {
        toast.success(`Store ${isSuspended ? "reactivated" : "suspended"} successfully!`);
        setOpen(false);
      }
    });
  };

  return (
    <>
      <Button
        variant={isSuspended ? "default" : "destructive"}
        size="sm"
        className="gap-1.5 text-xs font-semibold"
        onClick={() => setOpen(true)}
      >
        {isSuspended ? (
          <>
            <ShieldCheck className="h-4 w-4" />
            <span>Reactivate Store</span>
          </>
        ) : (
          <>
            <ShieldAlert className="h-4 w-4" />
            <span>Suspend Store</span>
          </>
        )}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSuspended ? `Reactivate ${storeName}?` : `Suspend ${storeName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {isSuspended
                ? "This will restore the vendor's public storefront and enable customer order placement immediately."
                : "This will pause the storefront, displaying a 'temporarily unavailable' notice to customers and preventing checkout."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              disabled={isPending}
              className={
                isSuspended
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSuspended ? (
                "Confirm Reactivation"
              ) : (
                "Confirm Suspension"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

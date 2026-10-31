"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Ban } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cancelSubscriptionAction } from "../actions";

interface CancelSubscriptionModalProps {
  tenantId: string;
  periodEnd?: string | null;
}

export function CancelSubscriptionModal({
  tenantId,
  periodEnd,
}: CancelSubscriptionModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const handleCancel = () => {
    startTransition(async () => {
      const res = await cancelSubscriptionAction(tenantId);
      if (!res.ok) {
        toast.error("Failed to cancel subscription", { description: res.message });
      } else {
        toast.success("Subscription scheduled for cancellation at period end.");
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-destructive hover:bg-destructive/10 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Ban className="h-3.5 w-3.5" />
        <span>Cancel at period end</span>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
          <AlertDialogDescription className="text-xs space-y-2">
            <p>
              Your store will remain fully active and accessible to your customers until the end of your current billing cycle
              {periodEnd ? ` (${new Date(periodEnd).toLocaleDateString()})` : ""}.
            </p>
            <p>
              After that date, your public storefront will be paused and checkout will be locked until you resubscribe.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            <span>Confirm Cancellation</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

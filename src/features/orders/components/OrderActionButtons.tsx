"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Truck,
  CheckCircle2,
  Ban,
  CreditCard,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { OrderStatus, OrderPaymentStatus } from "../types";
import {
  vendorUpdateOrderStatusAction,
  vendorCancelOrderAction,
  vendorUpdatePaymentStatusAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OrderActionButtons({
  tenantId,
  tenantSlug,
  orderId,
  currentStatus,
  currentPaymentStatus,
}: {
  tenantId: string;
  tenantSlug: string;
  orderId: string;
  currentStatus: OrderStatus;
  currentPaymentStatus: OrderPaymentStatus;
}) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cancel dialog state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleStatusTransition = async (nextStatus: "confirmed" | "shipped" | "delivered") => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await vendorUpdateOrderStatusAction(
        tenantId,
        tenantSlug,
        orderId,
        nextStatus
      );

      if (!res.ok) {
        setErrorMessage(res.message);
      } else {
        router.refresh();
      }
    } catch {
      setErrorMessage("Failed to update status. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await vendorUpdatePaymentStatusAction(
        tenantId,
        tenantSlug,
        orderId,
        "paid",
        "Payment received via Cash on Delivery"
      );

      if (!res.ok) {
        setErrorMessage(res.message);
      } else {
        router.refresh();
      }
    } catch {
      setErrorMessage("Failed to update payment status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await vendorCancelOrderAction(
        tenantId,
        tenantSlug,
        orderId,
        cancelReason
      );

      if (!res.ok) {
        setErrorMessage(res.message);
      } else {
        setIsCancelDialogOpen(false);
        setCancelReason("");
        router.refresh();
      }
    } catch {
      setErrorMessage("Failed to cancel order.");
    } finally {
      setIsLoading(false);
    }
  };

  const canCancel = currentStatus === "pending" || currentStatus === "confirmed";
  const canMarkPaid = currentPaymentStatus !== "paid" && currentStatus !== "cancelled";

  return (
    <div className="space-y-3">
      {errorMessage && (
        <Alert variant="destructive" className="text-xs">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Next Valid State Button */}
        {currentStatus === "pending" && (
          <Button
            size="sm"
            disabled={isLoading}
            onClick={() => handleStatusTransition("confirmed")}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span>Confirm Order</span>
          </Button>
        )}

        {currentStatus === "confirmed" && (
          <Button
            size="sm"
            disabled={isLoading}
            onClick={() => handleStatusTransition("shipped")}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
            <span>Mark as Shipped</span>
          </Button>
        )}

        {currentStatus === "shipped" && (
          <Button
            size="sm"
            disabled={isLoading}
            onClick={() => handleStatusTransition("delivered")}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>Mark as Delivered</span>
          </Button>
        )}

        {/* Mark as Paid Button */}
        {canMarkPaid && (
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={handleMarkAsPaid}
            className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Mark as Paid</span>
          </Button>
        )}

        {/* Cancel Order Button */}
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            disabled={isLoading}
            onClick={() => setIsCancelDialogOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>Cancel Order</span>
          </Button>
        )}
      </div>

      {/* Cancel Order Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel this order? Tracked products will be automatically returned to inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="cancelReason" className="text-xs font-medium">
              Reason for Cancellation (Optional)
            </Label>
            <Input
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer requested, Out of delivery area"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => setIsCancelDialogOpen(false)}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={handleCancelOrder}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


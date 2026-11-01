"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, AlertTriangle } from "lucide-react";
import { customerCancelOrderAction } from "@/features/orders/actions";
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

export function CustomerCancelOrderButton({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Prompt requirement: "Cancel order" button visible ONLY while pending
  if (status !== "pending") {
    return null;
  }

  const handleCancel = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await customerCancelOrderAction(orderId, reason);
      if (!res.ok) {
        setErrorMessage(res.message);
        setIsLoading(false);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    } catch {
      setErrorMessage("Failed to cancel order. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
      >
        <Ban className="h-3.5 w-3.5" />
        <span>Cancel Order</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Your Order</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <Alert variant="destructive" className="text-xs">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 py-2">
            <Label htmlFor="customerCancelReason" className="text-xs font-medium">
              Reason for cancellation (optional)
            </Label>
            <Input
              id="customerCancelReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Ordered by mistake, Need to change address"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => setIsOpen(false)}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isLoading}
              onClick={handleCancel}
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
    </>
  );
}


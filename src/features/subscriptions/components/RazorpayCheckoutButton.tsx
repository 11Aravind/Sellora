"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startCheckout, getSubscriptionStatusAction } from "../actions";

interface RazorpayCheckoutButtonProps {
  tenantId: string;
  isTrialing?: boolean;
  className?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function RazorpayCheckoutButton({
  tenantId,
  isTrialing,
  className,
}: RazorpayCheckoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPolling, setIsPolling] = React.useState(false);
  const [pollingTimeElapsed, setPollingTimeElapsed] = React.useState(0);

  // Helper to dynamically inject Razorpay Checkout.js
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Could not load payment gateway. Please check your connection.");
        setIsLoading(false);
        return;
      }

      const res = await startCheckout(tenantId);
      if (!res.ok) {
        toast.error("Unable to initiate checkout", { description: res.message });
        setIsLoading(false);
        return;
      }

      const { data } = res;

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "SaaS Commerce",
        description: `${data.planName} Subscription`,
        prefill: {
          email: data.email,
        },
        theme: {
          color: "#0f172a",
        },
        handler: function () {
          // IMPORTANT: Never update DB directly from client callback.
          // Start polling the server until the webhook updates the subscription.
          setIsLoading(false);
          setIsPolling(true);
          startStatusPolling();
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
      };

      if (!window.Razorpay) {
        toast.error("Razorpay SDK not initialized.");
        setIsLoading(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      console.error("[RazorpayCheckout] Error:", err);
      toast.error("An unexpected error occurred during checkout setup.");
      setIsLoading(false);
    }
  };

  const startStatusPolling = () => {
    const startTime = Date.now();
    const maxPollDuration = 60 * 1000; // 60 seconds
    const intervalMs = 3000; // Poll every 3 seconds

    const pollTimer = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      setPollingTimeElapsed(Math.round(elapsed / 1000));

      try {
        const { status } = await getSubscriptionStatusAction(tenantId);

        if (status === "active") {
          clearInterval(pollTimer);
          setIsPolling(false);
          toast.success("Payment confirmed! Your subscription is now active.");
          router.refresh();
          return;
        }

        if (elapsed >= maxPollDuration) {
          clearInterval(pollTimer);
          setIsPolling(false);
          toast.info(
            "Payment is being processed by Razorpay. Your status will update shortly once the webhook arrives."
          );
          router.refresh();
        }
      } catch (err) {
        console.error("[Polling error]:", err);
      }
    }, intervalMs);
  };

  return (
    <>
      <Button
        onClick={handleSubscribe}
        disabled={isLoading || isPolling}
        className={className || "gap-2 font-semibold"}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            <span>{isTrialing ? "Set Up Payment Method" : "Subscribe Now"}</span>
          </>
        )}
      </Button>

      {/* Confirmation Polling Dialog */}
      <Dialog open={isPolling}>
        <DialogContent className="sm:max-w-md text-center py-8">
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Confirming Payment...
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Please wait while Razorpay verifies your payment with your bank ({pollingTimeElapsed}s). Do not close this window.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

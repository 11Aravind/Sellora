"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Clock, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionBannerProps {
  status: string;
  trialEndsAt?: string | null;
  tenantSlug: string;
}

const nowStore = {
  subscribe(callback: () => void) {
    const timer = setInterval(callback, 60000);
    return () => clearInterval(timer);
  },
  getSnapshot() {
    return Date.now();
  },
  getServerSnapshot() {
    return 0;
  },
};

export function SubscriptionBanner({
  status,
  trialEndsAt,
  tenantSlug,
}: SubscriptionBannerProps) {
  const billingHref = `/dashboard/${tenantSlug}/billing`;
  const currentNow = React.useSyncExternalStore(
    nowStore.subscribe,
    nowStore.getSnapshot,
    nowStore.getServerSnapshot
  );

  let daysLeft: number | null = null;
  if (status === "trialing" && trialEndsAt && currentNow > 0) {
    const trialDate = new Date(trialEndsAt);
    const msRemaining = trialDate.getTime() - currentNow;
    daysLeft = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  }

  // 1. Store locked / Subscription inactive or expired
  if (status === "expired" || status === "incomplete") {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            <strong>Store Locked:</strong> Your subscription is inactive or expired. Your customer storefront is paused. Please subscribe to restore storefront access.
          </span>
        </div>
        <Link href={billingHref}>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs font-semibold gap-1 bg-white text-destructive hover:bg-white/90"
          >
            <span>Activate Plan</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  // 2. Payment failed / Past due
  if (status === "past_due") {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Payment Failed:</strong> Your recent renewal payment could not be processed. Please update your payment method to avoid store suspension.
          </span>
        </div>
        <Link href={billingHref}>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs font-semibold gap-1 bg-white text-destructive hover:bg-white/90"
          >
            <span>Fix Payment</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  // 3. Free Trial ending soon (within 7 days)
  if (status === "trialing" && daysLeft !== null && daysLeft <= 7) {
    return (
      <div className="bg-amber-500 text-white dark:bg-amber-600 px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            <strong>Trial Ending Soon:</strong> You have{" "}
            {daysLeft === 0 ? "less than 24 hours" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`} left in your free trial. Set up payment details to ensure zero storefront downtime.
          </span>
        </div>
        <Link href={billingHref}>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs font-semibold gap-1 bg-white text-amber-800 hover:bg-white/90"
          >
            <span>Add Payment Details</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}

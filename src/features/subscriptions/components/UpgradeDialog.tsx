"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { friendlyMessage } from "@/lib/errors";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  title?: string;
  description?: string;
  errorCode?: string;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  tenantSlug,
  title,
  description,
  errorCode = "PLAN_LIMIT_PRODUCTS",
}: UpgradeDialogProps) {
  const isInactive = errorCode === "SUBSCRIPTION_INACTIVE";
  const defaultTitle = isInactive
    ? "Subscription Inactive"
    : "Plan Limit Reached";

  const defaultDescription = friendlyMessage(errorCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isInactive ? (
              <ShieldAlert className="h-6 w-6 text-destructive" />
            ) : (
              <Sparkles className="h-6 w-6 text-amber-500" />
            )}
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            {title || defaultTitle}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/80 bg-muted/40 p-4 text-xs space-y-2">
          <div className="font-semibold text-foreground flex items-center justify-between">
            <span>Unlock higher quotas & advanced features</span>
            <span className="text-[10px] uppercase font-bold text-primary">Pro / Scale</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Upgrade your store to unlock higher product limits, additional staff seats, custom domains, and zero transaction fee order volume.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Link
            href={`/dashboard/${tenantSlug}/billing`}
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            <Button className="w-full gap-1.5 font-semibold">
              <span>View Plans & Upgrade</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

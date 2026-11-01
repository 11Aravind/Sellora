"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpgradeDialog } from "@/features/subscriptions/components/UpgradeDialog";
import { addMemberSchema, type AddMemberInput } from "../schemas";
import { addTeamMemberAction } from "../actions";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantSlug: string;
}

type SchemaType = Parameters<typeof zodResolver>[0];

export function AddMemberDialog({
  open,
  onOpenChange,
  tenantId,
  tenantSlug,
}: AddMemberDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [upgradeErrorCode, setUpgradeErrorCode] = React.useState<string | null>(null);

  const form = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema as unknown as SchemaType),
    defaultValues: {
      email: "",
      role: "staff",
    },
  });

  const onSubmit = async (values: AddMemberInput) => {
    try {
      setIsSubmitting(true);
      const res = await addTeamMemberAction(tenantId, values);

      if (!res.ok) {
        if (
          res.code === "PLAN_LIMIT_STAFF" ||
          res.code === "SUBSCRIPTION_INACTIVE"
        ) {
          onOpenChange(false);
          setUpgradeErrorCode(res.code);
          return;
        }

        toast.error(res.message);
        return;
      }

      toast.success("Team member added successfully.");
      form.reset();
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to add team member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Add Team Member</DialogTitle>
                <DialogDescription className="text-xs">
                  Grant an existing user access to manage your store catalog and orders.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="mem-email" className="text-xs font-semibold">
                User Email Address *
              </Label>
              <Input
                id="mem-email"
                type="email"
                placeholder="colleague@example.com"
                className="text-xs"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                The user must already have a registered account on the platform.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mem-role" className="text-xs font-semibold">
                Assigned Role *
              </Label>
              <select
                id="mem-role"
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                {...form.register("role")}
              >
                <option value="staff">Staff (Manage products, orders, categories)</option>
                <option value="admin">Admin (Manage team, store settings, catalog)</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                <span>Add Member</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog on PLAN_LIMIT_STAFF */}
      <UpgradeDialog
        open={!!upgradeErrorCode}
        onOpenChange={(open) => !open && setUpgradeErrorCode(null)}
        tenantSlug={tenantSlug}
        errorCode={upgradeErrorCode || "PLAN_LIMIT_STAFF"}
      />
    </>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Archive } from "lucide-react";
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
import { bulkArchiveProductsAction } from "../actions";

interface BulkArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  productIds: string[];
  onComplete?: () => void;
}

export function BulkArchiveDialog({
  open,
  onOpenChange,
  tenantId,
  productIds,
  onComplete,
}: BulkArchiveDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleBulkArchive = async () => {
    try {
      setIsSubmitting(true);
      const res = await bulkArchiveProductsAction(tenantId, productIds);
      if (!res.ok) {
        toast.error(res.message);
        setIsSubmitting(false);
        return;
      }

      toast.success(`Archived ${res.data.archivedCount} product(s).`);
      onOpenChange(false);
      onComplete?.();
      router.refresh();
    } catch {
      toast.error("An error occurred during bulk archive.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Archive className="h-4 w-4" />
            </div>
            <AlertDialogTitle className="text-base font-bold">
              Archive {productIds.length} Selected Product{productIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs leading-relaxed pt-1">
            Archived products are hidden from your customer storefront and will free up your plan product quota. You can unarchive them later from the Archived filter tab.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-xs" disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleBulkArchive();
            }}
            disabled={isSubmitting}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            <span>Archive Products</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

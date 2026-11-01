"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { deleteCategoryAction } from "../actions";
import type { Category } from "../types";

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  category: Category | null;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  tenantId,
  category,
}: DeleteCategoryDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!category) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteCategoryAction(tenantId, category.id);
      if (!res.ok) {
        toast.error(res.message);
        setIsDeleting(false);
        return;
      }

      toast.success(`Category "${category.name}" deleted.`);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold">
            Delete Category &quot;{category.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            Are you sure you want to remove this category? Products assigned to this category will become unassigned, and subcategories will be moved to the top level.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-xs" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
          >
            {isDeleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            <span>Delete Category</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

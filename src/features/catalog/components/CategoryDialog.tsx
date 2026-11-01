"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, FolderTree, Sparkles } from "lucide-react";
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
import {
  categoryFormSchema,
  type CategoryFormInput,
} from "../schemas";
import { createCategoryAction, updateCategoryAction } from "../actions";
import type { Category } from "../types";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  category?: Category | null;
  allCategories: Category[];
}

type SchemaType = Parameters<typeof zodResolver>[0];

export function CategoryDialog({
  open,
  onOpenChange,
  tenantId,
  category,
  allCategories,
}: CategoryDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditing = !!category;

  // Filter out self and circular descendants from potential parent choices
  const availableParents = allCategories.filter((c) => (isEditing ? c.id !== category.id : true));

  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema as unknown as SchemaType),
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      parentId: category?.parent_id || null,
      sortOrder: category?.sort_order ?? 0,
    },
  });

  React.useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        slug: category.slug,
        parentId: category.parent_id,
        sortOrder: category.sort_order,
      });
    } else {
      form.reset({
        name: "",
        slug: "",
        parentId: null,
        sortOrder: 0,
      });
    }
  }, [category, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    form.setValue("name", val, { shouldValidate: true });
    // Auto-generate slug if create mode and user hasn't manually modified slug
    if (!isEditing && !form.getFieldState("slug").isDirty) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      form.setValue("slug", generated, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: CategoryFormInput) => {
    try {
      setIsSubmitting(true);
      const res = isEditing
        ? await updateCategoryAction(tenantId, category.id, values)
        : await createCategoryAction(tenantId, values);

      if (!res.ok) {
        toast.error(res.message);
        setIsSubmitting(false);
        return;
      }

      toast.success(isEditing ? "Category updated successfully" : "Category created successfully");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred while saving the category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderTree className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {isEditing ? "Edit Category" : "Add New Category"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEditing
                  ? "Update category details and hierarchy position."
                  : "Organize products into navigable collections."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Category Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name" className="text-xs font-semibold">
              Category Name *
            </Label>
            <Input
              id="cat-name"
              placeholder="e.g. Footwear, Summer Sale"
              className="text-xs"
              value={form.watch("name")}
              onChange={handleNameChange}
            />
            {form.formState.errors.name && (
              <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="cat-slug" className="text-xs font-semibold">
                URL Slug *
              </Label>
              <button
                type="button"
                onClick={() => {
                  const val = form.getValues("name") || "";
                  const generated = val
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");
                  form.setValue("slug", generated, { shouldValidate: true });
                }}
                className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <Sparkles className="h-3 w-3" />
                <span>Auto-generate</span>
              </button>
            </div>
            <Input
              id="cat-slug"
              placeholder="footwear"
              className="text-xs font-mono"
              {...form.register("slug")}
            />
            {form.formState.errors.slug && (
              <p className="text-[11px] text-destructive">{form.formState.errors.slug.message}</p>
            )}
          </div>

          {/* Optional Parent Category */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-parent" className="text-xs font-semibold">
              Parent Category (Optional)
            </Label>
            <select
              id="cat-parent"
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.watch("parentId") || ""}
              onChange={(e) => form.setValue("parentId", e.target.value || null)}
            >
              <option value="">None (Top-Level Category)</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-sort" className="text-xs font-semibold">
              Sort Order
            </Label>
            <Input
              id="cat-sort"
              type="number"
              min="0"
              placeholder="0"
              className="text-xs w-32"
              {...form.register("sortOrder", { valueAsNumber: true })}
            />
            <p className="text-[11px] text-muted-foreground">
              Lower numbers appear first in storefront navigation.
            </p>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs font-semibold" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Category"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
